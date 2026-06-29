from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.tongyi_service import generate_lesson
from services.vision_service import analyze_homework
from agent.agent_core import run_agent
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
# Agent 端点（阶段 1：Function Calling demo）
# ============================================================
class AgentRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[List[Dict]] = None

@app.post("/api/agent/demo")
def agent_demo(request: AgentRequest, authorization: Optional[str] = Header(None)):
    """
    Agent demo 端点（阶段 2b-2：支持多轮对话记忆）。

    支持两种请求格式：
    1. 兼容旧方式：{"message": "帮我备一节静电场的物理课"}
    2. 多轮对话：{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}

    authorization: 前端透传的 JWT Bearer token，用于 save_lesson_to_history 工具调后端鉴权。
    """
    # 从 "Bearer xxx" 中提取纯 token
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    try:
        # 多轮对话模式（优先使用 messages）
        if request.messages:
            result = run_agent(messages=request.messages, token=token)
        else:
            # 兼容旧方式：单条消息
            result = run_agent(user_message=request.message or "", token=token)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
