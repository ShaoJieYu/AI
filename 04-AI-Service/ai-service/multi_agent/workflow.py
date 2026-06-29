"""
LangGraph 工作流编排

3 个 Agent 工作流（移除 export Agent，用户通过备课历史页面的按钮导出 PDF）：
    teaching_design → content_generation → qa → END（QA 通过即结束）

QA 不通过时支持打回循环：
    - content 问题 → 打回到 content_generation
    - structure 问题 → 打回到 teaching_design
    - 超过 max_retry → 强制结束

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
# 线性工作流（不含打回循环，验证用）
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
# 完整工作流（含条件路由和打回循环）
# ============================================================
def route_after_qa(state: Dict[str, Any]) -> str:
    """
    质检后的条件路由函数。

    根据 qa_result 决定下一个节点：
    - overall_pass=True → END（通过，工作流结束，由 SSE 端点自动保存到备课历史）
    - issue_type="content" → "content_generation"（打回到内容生成）
    - issue_type="structure" → "teaching_design"（打回到教学设计）
    - 超过 max_retry → END（强制结束，由 SSE 端点自动保存）
    """
    qa_result = state.get("qa_result", {})
    retry_count = state.get("retry_count", 0)
    max_retry = state.get("max_retry", 3)

    # 超过最大重做次数，强制结束
    if retry_count >= max_retry:
        return END

    # 质检通过，结束
    if qa_result.get("overall_pass", False):
        return END

    # 不通过，根据 issue_type 路由
    issue_type = qa_result.get("issue_type", "content")
    if issue_type == "structure":
        return "teaching_design"
    else:
        return "content_generation"


def build_lesson_plan_workflow():
    """
    构建完整的 Multi-Agent 工作流（含条件路由和打回循环）。

    工作流结构：
        teaching_design → content_generation → qa → (条件路由)
                                                   ├─ 通过 → END（SSE 端点自动保存到备课历史）
                                                   ├─ content 问题 → content_generation（重做）
                                                   └─ structure 问题 → teaching_design（重新规划）
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

    # 条件边：质检后根据 issue_type 路由
    workflow.add_conditional_edges(
        "qa",
        route_after_qa,
        {
            END: END,
            "content_generation": "content_generation",
            "teaching_design": "teaching_design",
        },
    )

    # 编译工作流
    return workflow.compile()


def get_workflow(use_full: bool = False):
    """
    获取工作流实例。

    参数：
        use_full: True=完整工作流（含打回循环），False=线性工作流（验证用）

    返回：
        编译后的 LangGraph 工作流实例
    """
    if use_full:
        return build_lesson_plan_workflow()
    return build_linear_workflow()
