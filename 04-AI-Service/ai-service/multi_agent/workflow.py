"""
LangGraph 工作流编排

3 套工作流（按使用场景可选）：
1. build_teaching_and_content_workflow()：只含教学设计 + 内容生成（当前默认，QA 临时停用）
2. build_linear_workflow()：3 个 Agent 顺序串联（含 QA，不打回）
3. build_lesson_plan_workflow()：完整工作流（含 QA 打回循环）

当前阶段（2026-06 QA 优化期）：停用 QA Agent，只跑前 2 个 Agent。
停用原因：QA Agent 的 JSON 解析在小模型上不稳定，需要重新设计。
恢复条件：QA Agent 优化完成后改回 build_lesson_plan_workflow()。

工作流完成后，由 main.py 的 SSE 端点自动调用 save_lesson_to_history
保存到备课历史，用户在备课历史详情页点导出按钮导出 PDF。

LangGraph 核心概念：
- StateGraph：以 State 对象为中心的工作流图
- node：工作流节点，每个节点是一个函数（接收 state，返回更新 dict）
- edge：节点间的边，决定执行顺序
- conditional edge：条件边，根据 state 动态决定下一个节点
- compile()：编译工作流，生成可执行的 app
- invoke(state)：同步执行
- stream(state)：同步流式执行（SSE 用）
"""
from typing import Dict, Any
from langgraph.graph import StateGraph, END

from multi_agent.state import LessonPlanState
from multi_agent.agents.teaching_design import teaching_design_agent
from multi_agent.agents.content_generation import content_generation_agent
from multi_agent.agents.qa import qa_agent


# ============================================================
# 当前默认工作流：只含教学设计 + 内容生成（QA 临时停用）
# ============================================================
def build_teaching_and_content_workflow():
    """
    构建当前默认的 2 节点工作流：teaching_design → content_generation → END

    说明：QA Agent 临时停用。
    停用原因：QA Agent 的 JSON 解析在小模型上不稳定，需要重新设计。
    恢复条件：QA Agent 优化完成后改回 build_lesson_plan_workflow()。

    工作流结构：
        teaching_design → content_generation → END（SSE 端点自动保存到备课历史）
    """
    workflow = StateGraph(LessonPlanState)

    # 添加 2 个节点
    workflow.add_node("teaching_design", teaching_design_agent)
    workflow.add_node("content_generation", content_generation_agent)

    # 设置入口
    workflow.set_entry_point("teaching_design")

    # 线性边
    workflow.add_edge("teaching_design", "content_generation")
    workflow.add_edge("content_generation", END)  # 直接结束，不进 QA

    # 编译工作流
    return workflow.compile()


# ============================================================
# 线性工作流（含 QA，不打回，验证用）
# ============================================================
def build_linear_workflow():
    """
    构建线性工作流：teaching_design → content_generation → qa → END

    QA 执行完即结束，不打回。用于基础验证。
    """
    workflow = StateGraph(LessonPlanState)

    # 添加 3 个节点
    workflow.add_node("teaching_design", teaching_design_agent)
    workflow.add_node("content_generation", content_generation_agent)
    workflow.add_node("qa", qa_agent)

    # 设置入口
    workflow.set_entry_point("teaching_design")

    # 添加线性边（顺序串联）
    workflow.add_edge("teaching_design", "content_generation")
    workflow.add_edge("content_generation", "qa")
    workflow.add_edge("qa", END)  # QA 结束即工作流结束

    # 编译工作流
    return workflow.compile()


# ============================================================
# 完整工作流（含条件路由和打回循环，QA 启用时用）
# ============================================================
def route_after_qa(state: Dict[str, Any]) -> str:
    """
    质检后的条件路由函数。

    根据 qa_result 决定下一个节点：
    - overall_pass=True → END（通过，工作流结束，由 SSE 端点自动保存到备课历史）
    - 任何不通过情况 → "content_generation"（打回重做内容，保留原教学设计）
    - 超过 max_retry → END（强制结束，由 SSE 端点自动保存）

    设计决策：禁止打回教学设计 Agent。
    即便质检指出"段落数不对"或"教学目标偏离"等问题，也只重做内容生成阶段，
    让内容生成 Agent 根据质检建议 + 原教学设计 重新生成（避免反复重做骨架浪费时间）。
    """
    qa_result = state.get("qa_result", {})
    retry_count = state.get("retry_count", 0)
    max_retry = state.get("max_retry", 1)

    # 超过最大重做次数，强制结束
    if retry_count >= max_retry:
        return END

    # 质检通过，结束
    if qa_result.get("overall_pass", False):
        return END

    # 不通过：统一打回到 content_generation（不再打回到 teaching_design）
    # 即使 qa_result.issue_type = "structure" 也打回 content_generation
    # content_generation 会读取原 teaching_design + 质检建议，重新生成内容
    return "content_generation"


def build_lesson_plan_workflow():
    """
    构建完整的 Multi-Agent 工作流（含条件路由和打回循环，QA 启用时用）。

    工作流结构：
        teaching_design → content_generation → qa → (条件路由)
                                                   ├─ 通过 → END（SSE 端点自动保存到备课历史）
                                                   └─ 不通过 → content_generation（重做内容，保留教学设计）
    """
    workflow = StateGraph(LessonPlanState)

    # 添加 3 个节点
    workflow.add_node("teaching_design", teaching_design_agent)
    workflow.add_node("content_generation", content_generation_agent)
    workflow.add_node("qa", qa_agent)

    # 设置入口
    workflow.set_entry_point("teaching_design")

    # 固定边
    workflow.add_edge("teaching_design", "content_generation")
    workflow.add_edge("content_generation", "qa")

    # 条件边：质检后只可能走向 END 或 content_generation
    workflow.add_conditional_edges(
        "qa",
        route_after_qa,
        {
            END: END,
            "content_generation": "content_generation",
        },
    )

    # 编译工作流
    return workflow.compile()


def get_workflow(mode: str = "teaching_content"):
    """
    获取工作流实例。

    参数：
        mode: 工作流模式
            - "teaching_content"：默认，只含教学设计 + 内容生成（QA 停用）
            - "linear"：3 个 Agent 顺序串联（含 QA，不打回，验证用）
            - "full"：完整工作流（含 QA 打回循环，QA 启用时用）

    返回：
        编译后的 LangGraph 工作流实例
    """
    if mode == "full":
        return build_lesson_plan_workflow()
    if mode == "linear":
        return build_linear_workflow()
    # 默认：QA 停用
    return build_teaching_and_content_workflow()
