from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.tongyi_service import generate_lesson
from services.vision_service import analyze_homework
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
            request.custom_requirements
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
