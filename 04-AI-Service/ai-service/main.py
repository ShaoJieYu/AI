from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.tongyi_service import generate_lesson
from services.vision_service import analyze_homework
from agent.agent_core import run_agent, run_agent_step, generate_summary
from agent.planner import generate_plan
from typing import Optional, Dict, List
import uvicorn
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
