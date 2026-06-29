from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.tongyi_service import generate_lesson
from services.vision_service import analyze_homework
from agent.agent_core import run_agent, run_agent_step, generate_summary
from agent.planner import generate_plan
from multi_agent.agents.teaching_design import teaching_design_agent
from multi_agent.workflow import build_linear_workflow, build_lesson_plan_workflow
from multi_agent.state import create_initial_state
from common.redis_client import save_multi_agent_state, load_multi_agent_state
from typing import Optional, Dict, List
import uvicorn
import json
from datetime import datetime
from config import SERVICE_PORT

app = FastAPI(title="AI Lesson Generation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LessonRequest(BaseModel):
    subject: str
    teaching_goal: str
    difficulty: str = "中等"
    student_info: Optional[Dict] = None
    mode: Optional[str] = None
    duration: Optional[int] = None
    custom_requirements: Optional[str] = None
    weak_points: Optional[List[Dict]] = None

class HomeworkImageRequest(BaseModel):
    images: List[str] # List of base64 encoded strings

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-lesson-generation"}

@app.post("/api/generate-lesson")
def generate_lesson_endpoint(request: LessonRequest):
    try:
        result = generate_lesson(
            request.subject,
            request.teaching_goal,
            request.difficulty,
            request.student_info,
            request.mode,
            request.duration,
            request.custom_requirements,
            request.weak_points
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-homework-images")
def analyze_homework_endpoint(request: HomeworkImageRequest):
    try:
        if not request.images:
            raise HTTPException(status_code=400, detail="未提供图片数据")
        result = analyze_homework(request.images)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Agent 端点（阶段 3：Planning 逐步执行模式）
# ============================================================
class AgentRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[Dict]] = None
    # 阶段 3 新增：模式控制
    mode: Optional[str] = None  # "plan" | "execute_step" | "summary" | None(兼容旧模式)
    plan_step: Optional[Dict] = None  # execute_step 模式下传入当前步骤信息
    plan: Optional[List[Dict]] = None  # summary 模式下传入完整计划

@app.post("/api/agent/demo")
def agent_demo(request: AgentRequest, authorization: Optional[str] = Header(None)):
    """
    Agent 端点（阶段 3：支持 Planning 逐步执行）。

    三种模式：
    1. mode="plan" — 生成执行计划（混合策略：模板兜底 + AI 动态增减）
    2. mode="execute_step" — 执行计划中的单个步骤，返回结果等用户确认
    3. mode="summary" — 所有步骤完成后生成总结
    4. mode=None — 兼容旧模式（一次性执行完整 Agent 循环）

    authorization: 前端透传的 JWT Bearer token
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        # ===== 阶段 3：Planning 模式 =====
        if request.mode == "plan":
            # 生成执行计划
            user_msg = request.message or ""
            if request.messages:
                # 从消息历史中提取最新的用户消息
                for msg in reversed(request.messages):
                    if msg.get("role") == "user":
                        user_msg = msg.get("content", "")
                        break
            return generate_plan(user_msg)

        elif request.mode == "execute_step":
            # 执行单个步骤
            if not request.messages or not request.plan_step:
                raise HTTPException(status_code=400, detail="execute_step 模式需要 messages 和 plan_step 参数")
            return run_agent_step(
                messages=request.messages,
                plan_step=request.plan_step,
                token=token
            )

        elif request.mode == "summary":
            # 生成总结
            if not request.messages or not request.plan:
                raise HTTPException(status_code=400, detail="summary 模式需要 messages 和 plan 参数")
            return generate_summary(
                messages=request.messages,
                plan=request.plan,
                token=token
            )

        else:
            # ===== 兼容旧模式（一次性执行） =====
            if request.messages:
                result = run_agent(messages=request.messages, token=token)
            else:
                result = run_agent(user_message=request.message or "", token=token)
            return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 阶段 4：Multi-Agent 测试端点（Step 3 临时验证用）
# ============================================================
class TeachingDesignTestRequest(BaseModel):
    user_request: str
    student_profile: Optional[Dict] = None

@app.post("/test/teaching-design")
def test_teaching_design(request: TeachingDesignTestRequest, authorization: Optional[str] = Header(None)):
    """
    临时测试端点：验证教学设计 Agent 的 ReAct 循环和四层保障。

    输入：用户需求 + 可选学生画像
    输出：教学设计 JSON + ReAct 思考过程 trace
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        state = {
            "user_request": request.user_request,
            "session_id": "test_session",
            "student_profile": request.student_profile or {},
            "history": [],
            "teaching_design": None,
            "content_draft": None,
            "qa_result": None,
            "export_result": None,
            "retry_count": 0,
            "max_retry": 3,
            "current_node": "start",
            "status": "running",
            "agent_trace": [],
            "token": token,
        }

        result = teaching_design_agent(state)

        return {
            "success": True,
            "teaching_design": result.get("teaching_design"),
            "agent_trace": result.get("agent_trace", []),
            "current_node": result.get("current_node"),
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


# ============================================================
# 阶段 4 Step 4：线性工作流端点（4 Agent 顺序串联）
# ============================================================
class MultiAgentRunRequest(BaseModel):
    user_request: str
    student_profile: Optional[Dict] = None
    session_id: Optional[str] = None
    use_full_workflow: bool = False  # True=完整工作流（含打回），False=线性工作流

@app.post("/multi-agent/run-linear")
def run_multi_agent_linear(request: MultiAgentRunRequest, authorization: Optional[str] = Header(None)):
    """
    Step 4 验证端点：运行 Multi-Agent 工作流（同步返回最终 State）。

    线性工作流：teaching_design → content_generation → qa → export
    完整工作流：含质检打回循环

    输入：用户需求 + 可选学生画像
    输出：完整的最终 State（含 4 个 Agent 的产出和 agent_trace）
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        # 初始化 State
        state = create_initial_state(
            user_request=request.user_request,
            session_id=request.session_id or f"multi_agent_{id(request)}",
            student_profile=request.student_profile,
        )
        # token 不在 TypedDict 中，但 Agent 函数会从 state 读取
        state["token"] = token

        # 编译工作流
        if request.use_full_workflow:
            app_workflow = build_lesson_plan_workflow()
            workflow_type = "full"
        else:
            app_workflow = build_linear_workflow()
            workflow_type = "linear"

        # 同步执行工作流
        final_state = app_workflow.invoke(state)

        return {
            "success": True,
            "workflow_type": workflow_type,
            "final_state": final_state,
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


# ============================================================
# 阶段 4 Step 6：SSE 流式端点 + Redis 持久化
# ============================================================
def format_sse(data: dict) -> str:
    """格式化 SSE 事件"""
    return f"data: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


def make_agent_event(node_name: str, output: dict, is_complete: bool = True) -> dict:
    """
    根据节点输出构造 SSE 事件。

    参数：
        node_name: 节点名（teaching_design/content_generation/qa）
        output: 节点输出 dict
        is_complete: True=完成事件，False=开始事件

    返回：
        SSE 事件 dict
    """
    # 从 agent_trace 中取最后一条记录（当前节点的执行记录）
    agent_trace = output.get("agent_trace", [])
    current_trace = agent_trace[-1] if agent_trace else {}

    if is_complete:
        return {
            "type": "agent_complete",
            "agent": node_name,
            "output_summary": current_trace.get("output_summary", ""),
            "react_trace": current_trace.get("react_trace", []),
            "retry_attempt": current_trace.get("retry_attempt", 0),
            "timestamp": datetime.now().isoformat(),
            # 附带产出数据（前端右栏展示用）
            "teaching_design": output.get("teaching_design"),
            "content_draft": output.get("content_draft"),
            "qa_result": output.get("qa_result"),
            "retry_count": output.get("retry_count", 0),
        }
    else:
        return {
            "type": "agent_start",
            "agent": node_name,
            "input_summary": current_trace.get("input_summary", ""),
            "timestamp": datetime.now().isoformat(),
        }


# ============================================================
# 学科英文 → 中文映射（保留用于兼容旧数据，新流程已统一使用中文）
# ============================================================
SUBJECT_CN_MAP = {
    "physics": "物理",
    "chemistry": "化学",
    "biology": "生物",
    "math": "数学",
    "english": "英语",
    "chinese": "语文",
    "history": "历史",
    "geography": "地理",
    "politics": "政治",
}


def auto_save_to_history(state: dict, token: str) -> dict:
    """
    工作流完成后自动保存到备课历史。

    从 teaching_design 和 content_draft 提取参数，
    调用 save_lesson_to_history 工具保存到后端数据库。

    参数：
        state: 工作流最终 state
        token: 用户 JWT token（后端鉴权用）

    返回：
        {"success": bool, "message": str, "lesson_id": Optional[int]}
    """
    content_draft = state.get("content_draft") or {}
    teaching_design = state.get("teaching_design") or {}

    # 五段式内容必须齐全才能保存
    required_fields = ["coreDefinition", "teachingAnalysis", "mistakeWarnings",
                       "scoreBoosting", "exampleDerivation"]
    for field in required_fields:
        if not content_draft.get(field):
            return {"success": False, "message": f"内容不完整，缺少字段: {field}", "lesson_id": None}

    # subject 已统一为中文（schema 强约束），兼容老数据：若仍是英文则转换
    subject_raw = teaching_design.get("subject") or content_draft.get("subject") or ""
    subject_cn = SUBJECT_CN_MAP.get(subject_raw, subject_raw)

    try:
        from agent.tool_executor import save_lesson_to_history
        result_str = save_lesson_to_history(
            subject=subject_cn,
            teaching_goal=teaching_design.get("topic", content_draft.get("topic", "")),
            core_definition=content_draft.get("coreDefinition", ""),
            teaching_analysis=content_draft.get("teachingAnalysis", ""),
            mistake_warnings=content_draft.get("mistakeWarnings", ""),
            score_boosting=content_draft.get("scoreBoosting", ""),
            example_derivation=content_draft.get("exampleDerivation", ""),
            difficulty=teaching_design.get("difficulty", "中等"),
            duration=teaching_design.get("duration", 45),
            _token=token,
        )
        # save_lesson_to_history 返回字符串，成功时含 "ID=" 字样
        if "保存成功" in result_str:
            # 尝试提取 lesson_id
            import re
            match = re.search(r"ID=(\d+)", result_str)
            lesson_id = int(match.group(1)) if match else None
            return {"success": True, "message": result_str, "lesson_id": lesson_id}
        else:
            return {"success": False, "message": result_str, "lesson_id": None}
    except Exception as e:
        return {"success": False, "message": f"自动保存异常: {str(e)}", "lesson_id": None}


@app.get("/multi-agent/run")
def run_multi_agent_sse(
    user_request: str,
    session_id: str,
    use_full_workflow: bool = True,
    authorization: Optional[str] = Header(None),
):
    """
    Step 6 SSE 流式端点：运行 Multi-Agent 工作流，实时推送 Agent 执行进度。

    SSE 事件类型：
    - agent_start: Agent 开始执行
    - agent_complete: Agent 执行完成（含产出数据和 ReAct 思考过程）
    - qa_reject: 质检打回
    - workflow_complete: 工作流完成
    - agent_error: Agent 执行错误

    参数通过 query string 传递（SSE 标准）：
        user_request: 用户需求
        session_id: 会话 ID
        use_full_workflow: 是否使用完整工作流（含打回），默认 true
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    def event_stream():
        try:
            # 初始化 State
            state = create_initial_state(
                user_request=user_request,
                session_id=session_id,
            )
            state["token"] = token

            # 编译工作流
            if use_full_workflow:
                app_workflow = build_lesson_plan_workflow()
            else:
                app_workflow = build_linear_workflow()

            # 用 stream() 同步流式执行，获取每个节点的输出
            current_state = dict(state)

            for event in app_workflow.stream(state):
                # event 是 {node_name: output_dict} 格式
                for node_name, output in event.items():
                    if not isinstance(output, dict):
                        continue

                    # 合并输出到 current_state（用于 Redis 持久化）
                    current_state.update(output)

                    # 构造并推送 agent_complete 事件
                    sse_event = make_agent_event(node_name, output, is_complete=True)
                    yield format_sse(sse_event)

                    # 如果是质检节点且不通过，推送 qa_reject 事件
                    if node_name == "qa":
                        qa_result = output.get("qa_result", {})
                        if not qa_result.get("overall_pass", True) and not qa_result.get("forced_pass", False):
                            reject_event = {
                                "type": "qa_reject",
                                "agent": "qa",
                                "issue_type": qa_result.get("issue_type", "content"),
                                "issues": [],
                                "retry_count": output.get("retry_count", 0),
                                "route_to": "content_generation" if qa_result.get("issue_type") == "content" else "teaching_design",
                                "timestamp": datetime.now().isoformat(),
                            }
                            # 收集所有维度的 issues
                            for dim_name, dim_data in qa_result.get("dimensions", {}).items():
                                if dim_data.get("issues"):
                                    reject_event["issues"].extend(dim_data["issues"])
                            yield format_sse(reject_event)

                    # Redis 持久化（每个节点执行后保存）
                    save_multi_agent_state(session_id, current_state)

            # ===== 工作流完成后自动保存到备课历史 =====
            save_result = auto_save_to_history(current_state, token)

            # 推送保存结果事件（前端显示"已保存到备课历史"提示）
            yield format_sse({
                "type": "lesson_saved",
                "success": save_result["success"],
                "message": save_result["message"],
                "lesson_id": save_result["lesson_id"],
                "timestamp": datetime.now().isoformat(),
            })

            # 推送工作流完成事件
            yield format_sse({
                "type": "workflow_complete",
                "final_state": {
                    "status": current_state.get("status", "success"),
                    "retry_count": current_state.get("retry_count", 0),
                    "agent_trace_count": len(current_state.get("agent_trace", [])),
                    "teaching_design": current_state.get("teaching_design"),
                    "content_draft": current_state.get("content_draft"),
                    "qa_result": current_state.get("qa_result"),
                    "agent_trace": current_state.get("agent_trace", []),
                    "lesson_saved": save_result["success"],
                    "lesson_id": save_result["lesson_id"],
                },
                "timestamp": datetime.now().isoformat(),
            })

        except Exception as e:
            import traceback
            yield format_sse({
                "type": "agent_error",
                "agent": "workflow",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.now().isoformat(),
            })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        },
    )


@app.get("/multi-agent/state")
def get_multi_agent_state(session_id: str):
    """
    从 Redis 查询 Multi-Agent 工作流的当前 State（断线恢复用）。
    """
    state = load_multi_agent_state(session_id)
    if state is None:
        return {"success": False, "error": "未找到会话状态", "session_id": session_id}
    return {"success": True, "state": state, "session_id": session_id}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)