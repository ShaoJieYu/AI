# AI服务架构设计

**模块**: FastAPI AI 推理服务 | **框架**: Python 3.8+ + FastAPI 0.109.0 | **更新**: 2026-03-25

---

## 架构概览

```
┌─────────────────────────────────────────────┐
│   FastAPI 应用 (http://localhost:8001)     │
├─────────────────────────────────────────────┤
│                                            │
│  API Layer (Pydantic 数据验证)            │
│  ├─ POST /api/generate-lesson             │
│  ├─ GET  /health                          │
│  └─ (其他生成端点)                         │
│           │                               │
│  Service Layer (业务逻辑)                 │
│  ├─ LessonGenerationService              │
│  ├─ PromptManagement                     │
│  └─ ResponseFormatting                   │
│           │                               │
│  LLM Integration Layer                   │
│  ├─ DashScope (通义千问)                  │
│  └─ (Future: LangChain + 多模型)          │
└─────────────────────────────────────────────┘
           │
           ▼
    ┌─────────────────┐
    │  阿里 DashScope  │
    │  (通义千问 API) │
    └─────────────────┘
```

---

## 目录结构

```
ai-service/
├── main.py                      # FastAPI 应用入口
├── config.py                    # 配置管理
├── requirements.txt             # Python 依赖
│
├── services/
│   ├── __init__.py
│   └── tongyi_service.py       # 通义千问 LLM 集成
│       ├── generate_lesson()   # 生成备课内容
│       ├── generate_exercises() # 生成习题
│       └── validate_content()  # 内容审核
│
├── models/                      # Pydantic 数据模型 (可选)
│   └── schemas.py
│
├── utils/                       # 工具函数 (可选)
│   └── prompt_template.py      # Prompt 模板
│
└── logs/                        # 日志目录 (可选)
```

---

## 核心技术

### FastAPI 基础架构

#### 主应用配置
```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.tongyi_service import generate_lesson

app = FastAPI(
    title="AI Lesson Generation Service",
    description="备课内容自动生成服务",
    version="1.0.0"
)

# CORS 配置 - 允许前端和后端跨域调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Pydantic 数据验证

#### 请求模型
```python
from pydantic import BaseModel, Field
from typing import Optional, Dict

class LessonRequest(BaseModel):
    """备课生成请求"""
    subject: str = Field(..., min_length=1, description="学科")
    teaching_goal: str = Field(..., min_length=1, description="教学目标")
    difficulty: str = Field("中等", pattern="^(简单|中等|困难)$", description="难度")
    student_info: Optional[Dict] = Field(None, description="学生信息")
    
    class Config:
        examples = {
            "subject": "数学",
            "teaching_goal": "学习二次方程求解",
            "difficulty": "中等",
            "student_info": {"grade": "初三", "weaknesses": ["因式分解"]}
        }
```

#### 响应模型
```python
class LessonResponse(BaseModel):
    """备课生成响应"""
    lesson_outline: str = Field(..., description="教案大纲")
    key_concepts: List[str] = Field(..., description="关键概念")
    examples: List[Dict] = Field(..., description="教学示例")
    practice_problems: List[Dict] = Field(..., description="练习题")
    
    class Config:
        json_schema_extra = {
            "example": {
                "lesson_outline": "...",
                "key_concepts": ["概念1", "概念2"],
                "examples": [{"title": "例1", "content": "..."}],
                "practice_problems": [{"question": "?", "answer": "..."}]
            }
        }
```

### LLM 集成 (DashScope)

#### 通义千问服务
```python
# services/tongyi_service.py
import dashscope
from config import DASHSCOPE_API_KEY

dashscope.api_key = DASHSCOPE_API_KEY

def generate_lesson(subject: str, teaching_goal: str, difficulty: str, student_info: dict = None):
    """
    调用通义千问生成备课内容
    """
    # 构建 Prompt
    prompt = build_lesson_prompt(subject, teaching_goal, difficulty, student_info)
    
    # 调用 DashScope API
    response = dashscope.Generation.call(
        model='qwen-max',              # 使用最强模型
        messages=[
            {'role': 'user', 'content': prompt}
        ],
        temperature=0.7,               # 生成多样性
        top_p=0.8,                    # 核心采样
        max_tokens=2000,               # 最大返回长度
    )
    
    # 解析响应
    if response.status_code == 200:
        content = response.output.text
        return parse_lesson_content(content)
    else:
        raise Exception(f"AI 生成失败: {response.message}")

def build_lesson_prompt(subject, teaching_goal, difficulty, student_info):
    """构建 Prompt"""
    base_prompt = f"""
    你是一位资深教师，需要为以下信息生成详细的备课教案。
    
    学科: {subject}
    教学目标: {teaching_goal}
    难度: {difficulty}
    """
    
    if student_info:
        base_prompt += f"\n学生信息: {student_info}"
    
    base_prompt += """
    
    请生成以下内容：
    1. 教案大纲 (lesson_outline)
    2. 关键概念列表 (key_concepts)
    3. 教学示例 (examples)
    4. 练习题 (practice_problems)
    
    请以 JSON 格式返回。
    """
    
    return base_prompt
```

### API 端点设计

#### 健康检查
```python
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "service": "ai-lesson-generation",
        "version": "1.0.0"
    }
```

#### 生成端点
```python
@app.post("/api/generate-lesson")
async def generate_lesson_endpoint(request: LessonRequest):
    """
    生成备课内容
    
    - subject: 学科
    - teaching_goal: 教学目标
    - difficulty: 难度 (简单/中等/困难)
    - student_info: 学生信息 (可选)
    """
    try:
        result = generate_lesson(
            request.subject,
            request.teaching_goal,
            request.difficulty,
            request.student_info
        )
        return {
            "code": 200,
            "message": "Success",
            "data": result
        }
    except Exception as e:
        return {
            "code": 500,
            "message": str(e)
        }
```

---

## 配置管理

### config.py
```python
import os
from dotenv import load_dotenv

load_dotenv()

# ─── API Key ───
DASHSCOPE_API_KEY = os.getenv('DASHSCOPE_API_KEY')
if not DASHSCOPE_API_KEY:
    raise ValueError("DASHSCOPE_API_KEY not set in .env")

# ─── 服务配置 ───
SERVICE_PORT = int(os.getenv('SERVICE_PORT', '8001'))
SERVICE_HOST = os.getenv('SERVICE_HOST', '0.0.0.0')

# ─── LLM 配置 ───
MODEL_NAME = "qwen-max"        # 模型选择
TEMPERATURE = 0.7             # 创意度 (0-1)
TOP_P = 0.8                    # 核心采样
MAX_TOKENS = 2000              # 最大响应长度
REQUEST_TIMEOUT = 30           # 请求超时 (秒)

# ─── 日志配置 ───
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
```

---

## Prompt 工程

### 备课 Prompt 模板
```python
LESSON_PROMPT_TEMPLATE = """
你是一位经验丰富的教师，现在需要为学生设计一堂课。

【课程信息】
学科: {subject}
教学目标: {teaching_goal}
难度等级: {difficulty}

【学生背景】
{student_context}

【任务要求】
请生成一份完整的教案，包含以下内容：

1. **教案大纲** (lesson_outline)
   - 课程导入
   - 主要内容
   - 小结回顾

2. **关键概念** (key_concepts)
   - 列出 3-5 个本课程的核心概念
   - 每个概念 1-2 句简介

3. **教学示例** (examples)
   - 提供 2-3 个具体的教学例子
   - 每个例子包含：题目描述、解答过程、学习启示

4. **练习题** (practice_problems)
   - 提供 5-8 道循序渐进的练习题
   - 每题包含：题目、标准答案、难度、知识点关联

【输出格式】
请以下面的 JSON 格式返回，确保 JSON 格式正确：
{{
  "lesson_outline": "详细的教案大纲",
  "key_concepts": ["概念1", "概念2", ...],
  "examples": [
    {{
      "title": "例1标题",
      "description": "题目描述",
      "solution": "详细解答",
      "insight": "学习启示"
    }},
    ...
  ],
  "practice_problems": [
    {{
      "id": 1,
      "question": "题目",
      "answer": "答案",
      "difficulty": "简单/中等/困难",
      "knowledge_points": ["概念1", "概念2"]
    }},
    ...
  ]
}}

开始生成教案：
"""
```

---

## 错误处理和日志

### 错误处理
```python
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

@app.post("/api/generate-lesson")
async def generate_lesson_endpoint(request: LessonRequest):
    try:
        logger.info(f"生成备课: {request.subject}")
        
        if not DASHSCOPE_API_KEY:
            raise ValueError("API Key 未配置")
        
        result = generate_lesson(request)
        logger.info(f"生成成功")
        return result
        
    except ValueError as e:
        logger.error(f"验证错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"生成失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="内部服务错误"
        )
```

---

## 与后端的集成

### 后端调用 AI 服务
```java
// Java 后端 (Spring Boot)
@Service
public class AIIntegrationService {
    private static final String AI_SERVICE_URL = "http://localhost:8001";
    
    @Autowired
    private RestTemplate restTemplate;
    
    public LessonResponse generateLesson(LessonRequest request) {
        try {
            String url = AI_SERVICE_URL + "/api/generate-lesson";
            HttpEntity<LessonRequest> entity = new HttpEntity<>(request);
            ResponseEntity<ApiResponse<LessonResponse>> response = 
                restTemplate.postForEntity(url, entity, ApiResponse.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody().getData();
            } else {
                throw new RuntimeException("AI 服务返回异常");
            }
        } catch (RestClientException e) {
            logger.error("调用 AI 服务失败", e);
            throw new RuntimeException("AI 服务不可用");
        }
    }
}
```

---

## 性能优化

### 响应缓存
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_cached_prompt(subject: str, goal: str):
    """缓存 Prompt 模板，避免重复构建"""
    return LESSON_PROMPT_TEMPLATE.format(
        subject=subject,
        teaching_goal=goal
    )
```

### 异步处理
```python
from fastapi import BackgroundTasks
import asyncio

@app.post("/api/generate-lesson-async")
async def generate_lesson_async(
    request: LessonRequest,
    background_tasks: BackgroundTasks
):
    """异步生成，立即返回任务 ID，在后台处理"""
    task_id = str(uuid.uuid4())
    background_tasks.add_task(generate_and_store, task_id, request)
    return {"task_id": task_id, "status": "processing"}

async def generate_and_store(task_id: str, request: LessonRequest):
    """后台任务"""
    result = generate_lesson(request)
    # 存储结果到数据库
```

---

## 相关文档

- [ai-service/QUICK-START.md](./QUICK-START.md) - 快速启动
- [ai-service/LLM-INTEGRATION.md](./LLM-INTEGRATION.md) - LLM 集成详解
- [ai-service/PROMPT-DESIGN.md](./PROMPT-DESIGN.md) - Prompt 设计规范
- [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md) - 项目状态
