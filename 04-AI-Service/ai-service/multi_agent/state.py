"""
Multi-Agent 工作流的 State 定义

LangGraph 的核心是 State 对象在节点间传递。本模块定义全局共享的
LessonPlanState，4 个 Agent 都读写这个 State。

State 分四个区域：
1. 输入区：用户需求 + 会话上下文 + 学生画像
2. 产出区：4 个 Agent 的输出（增量更新）
3. 控制区：重做次数、当前节点、状态标识（防死循环 + 路由判断）
4. 审计区：agent_trace 记录每个 Agent 的执行过程（前端可视化 + 答辩演示）
"""
from typing import TypedDict, List, Optional, Dict, Any


class LessonPlanState(TypedDict):
    """
    LangGraph 全局共享 State。

    每个节点（Agent）接收 State 作为输入，返回 dict 作为更新，
    LangGraph 会自动合并到 State 中。
    """
    # ============================================================
    # 输入区（工作流启动时填充，运行中只读）
    # ============================================================
    user_request: str                # 用户原始需求（如"帮我准备一节物理课，主题是静电场"）
    session_id: str                  # Redis 会话 ID（持久化 + 断线恢复用）
    student_profile: Dict[str, Any]  # 学生画像（薄弱知识点等）
    history: List[Dict[str, Any]]    # 多轮对话历史（复用阶段 3 的 Redis 会话）

    # ============================================================
    # 产出区（4 个 Agent 的输出，增量更新）
    # ============================================================
    teaching_design: Optional[Dict[str, Any]]  # 教学设计 Agent 产出（五段式骨架）
    content_draft: Optional[Dict[str, Any]]    # 内容生成 Agent 产出（五段式完整内容）
    qa_result: Optional[Dict[str, Any]]        # 质检 Agent 产出（三维评分 + issue_type）
    export_result: Optional[Dict[str, Any]]    # 导出 Agent 产出（优化后内容 + PDF URL）

    # ============================================================
    # 控制区（工作流流转和防死循环）
    # ============================================================
    retry_count: int                 # 当前重做次数（每次打回递增）
    max_retry: int                   # 最大重做次数（默认 3，超过强制进导出）
    current_node: str                # 当前节点名（前端展示用）
    status: str                      # running / success / failed / forced_pass

    # ============================================================
    # 审计区（前端可视化 + 答辩演示杀手锏）
    # ============================================================
    agent_trace: List[Dict[str, Any]]  # 每个 Agent 的执行记录（含 ReAct 思考过程）


def create_initial_state(
    user_request: str,
    session_id: str,
    student_profile: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    max_retry: int = 3,
) -> LessonPlanState:
    """
    创建初始 State（工作流启动时调用）。

    参数：
        user_request: 用户原始需求
        session_id: Redis 会话 ID
        student_profile: 学生画像（可选）
        history: 多轮对话历史（可选）
        max_retry: 最大重做次数，默认 3

    返回：
        初始化的 LessonPlanState
    """
    return LessonPlanState(
        user_request=user_request,
        session_id=session_id,
        student_profile=student_profile or {},
        history=history or [],
        teaching_design=None,
        content_draft=None,
        qa_result=None,
        export_result=None,
        retry_count=0,
        max_retry=max_retry,
        current_node="start",
        status="running",
        agent_trace=[],
    )
