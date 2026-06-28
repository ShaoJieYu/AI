# AI服务快速启动指南

**模块**: AI 推理服务 | **框架**: Python 3.8+ + FastAPI 0.109.0 | **更新**: 2026-03-25

> ⚡ 3步启动，5分钟开始开发

---

## 前置要求

### 系统要求
- **Python**: 3.8+ (推荐 3.10 或 3.11)
- **pip**: 20.0+
- **操作系统**: Windows / macOS / Linux
- **通义千问 API Key**: 必须 (从阿里云获取)

### 验证环境
```bash
python --version     # 应该是 3.8+ 
pip --version        # pip 20.0+
python -m venv       # 虚拟环境支持
```

---

## 🚀 3步快速启动

### Step 1: 进入 AI 服务目录 (30秒)
```bash
cd ai-service
```

### Step 2: 创建虚拟环境并安装依赖 (2-3分钟)
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

**预期输出**:
```
Successfully installed fastapi-0.109.0 uvicorn-0.27.0 pydantic-2.5.3 ...
```

### Step 3: 配置 API Key 并启动服务 (30秒)

#### 3.1 获取通义千问 API Key
1. 访问 [阿里云 DashScope](https://dashscope.aliyun.com/)
2. 登录或注册账户
3. 在控制台创建 API Key
4. 复制 API Key

#### 3.2 配置环境变量
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env，填入 API Key
# .env
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
```

#### 3.3 启动服务
```bash
python main.py
```

**预期输出**:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete
```

✅ **完成！** 访问 http://localhost:8001/health 验证

---

## 常见问题

### Q1: 找不到 Python 3.8+
**原因**: Python 未安装或版本过低

**解决**:
```bash
# 下载安装 Python 3.10+
# https://www.python.org/downloads/

# 验证
python --version
```

### Q2: "ModuleNotFoundError: No module named 'fastapi'"
**原因**: 虚拟环境未激活或依赖未安装

**解决**:
```bash
# 确保虚拟环境激活
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 重新安装依赖
pip install -r requirements.txt
```

### Q3: "DASHSCOPE_API_KEY not found"
**原因**: `.env` 文件缺失或 API Key 未配置

**解决**:
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 并填入 API Key
# Windows 记事本
notepad .env
# macOS/Linux vim
vim .env
```

### Q4: "Connection error to Dashscope"
**原因**: API Key 错误或网络问题

**解决**:
```bash
# 验证 API Key 是否正确
cat .env | grep DASHSCOPE_API_KEY

# 测试网络连接
ping dashscope.aliyun.com

# 确保 API Key 有效（去阿里云后台检查）
```

### Q5: "端口 8001 已被占用"
**原因**: 其他应用占用了端口

**解决**:
```bash
# 修改端口，编辑 config.py
SERVICE_PORT = 8002

# 或运行时指定
uvicorn main:app --port 8002
```

### Q6: "ModuleNotFoundError: No module named 'dotenv'"
**原因**: python-dotenv 未安装

**解决**:
```bash
pip install python-dotenv
# 或重新安装所有依赖
pip install -r requirements.txt
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `python main.py` | 启动应用 |
| `uvicorn main:app --reload` | 开发模式（热更新） |
| `uvicorn main:app --port 8002` | 指定端口启动 |
| `pip install -r requirements.txt` | 安装依赖 |
| `pip freeze > requirements.txt` | 导出依赖列表 |
| `python -m pytest` | 运行测试 |

---

## 项目结构

```
ai-service/
├── main.py                    # FastAPI 应用入口
├── config.py                  # 配置文件（端口、日志等）
├── requirements.txt           # Python 依赖列表
├── .env.example              # 环境变量示例
├── .env                       # 环境变量（本地，不提交）
│
├── services/
│   ├── __init__.py
│   └── tongyi_service.py     # 通义千问 LLM 集成
│
├── venv/                      # Python 虚拟环境（本地，不提交）
└── logs/                      # 日志目录（可选）
```

---

## 核心配置文件

### .env 环境变量
```env
# 通义千问 API Key (必须)
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx

# 服务配置 (可选)
SERVICE_PORT=8001
LOG_LEVEL=INFO
```

### config.py
```python
import os
from dotenv import load_dotenv

load_dotenv()

# 服务端口
SERVICE_PORT = int(os.getenv('SERVICE_PORT', '8001'))

# API Key
DASHSCOPE_API_KEY = os.getenv('DASHSCOPE_API_KEY')

# 日志级别
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# 超时设置
REQUEST_TIMEOUT = 30  # 秒

# 模型配置
MODEL_NAME = "qwen-max"  # 通义千问模型
TEMPERATURE = 0.7        # 生成文本的随机性 (0-1)
TOP_P = 0.8             # 核心采样参数
```

---

## 技术栈速查

| 技术 | 用途 | 版本 |
|------|------|------|
| **Python** | 编程语言 | 3.8+ |
| **FastAPI** | Web 框架 | 0.109.0 |
| **Uvicorn** | ASGI 服务器 | 0.27.0 |
| **Pydantic** | 数据验证 | 2.5.3 |
| **DashScope** | 阿里通义千问 SDK | 1.14.0 |
| **python-dotenv** | 环境变量管理 | 1.0.0 |

---

## API 端点

### 健康检查
```bash
curl http://localhost:8001/health
```

**响应**:
```json
{
  "status": "ok",
  "service": "ai-lesson-generation"
}
```

### 备课内容生成
```bash
curl -X POST http://localhost:8001/api/generate-lesson \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "数学",
    "teaching_goal": "学习二次方程求解",
    "difficulty": "中等",
    "student_info": {
      "grade": "初三",
      "weaknesses": ["因式分解"]
    }
  }'
```

**响应**:
```json
{
  "lesson_outline": "...",
  "key_concepts": [...],
  "examples": [...],
  "practice_problems": [...]
}
```

---

## 开发建议

### 项目结构最佳实践
- `services/` - 业务逻辑（LLM 调用、Prompt 管理）
- `models/` - Pydantic 数据模型
- `routes/` - API 路由
- `utils/` - 工具函数
- `config/` - 配置管理

### Prompt 工程建议
- 使用清晰的指令语言
- 提供上下文和示例
- 测试不同的温度参数
- 监控生成质量

### 错误处理
```python
from fastapi import HTTPException

try:
    result = generate_lesson(...)
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

### 日志记录
```python
import logging

logger = logging.getLogger(__name__)
logger.info("生成备课内容...")
logger.error("生成失败", exc_info=True)
```

---

## 与后端集成

### 后端调用 AI 服务
```python
# Java 后端 RestTemplate 调用
RestTemplate restTemplate = new RestTemplate();
String url = "http://localhost:8001/api/generate-lesson";
ResponseEntity<String> response = restTemplate.postForEntity(
    url, 
    request, 
    String.class
);
```

### 请求超时处理
在 `config.py` 中配置:
```python
REQUEST_TIMEOUT = 60  # 长 Prompt 生成可能需要较长时间
```

### 异步调用建议
- 使用消息队列（RocketMQ/Redis）实现异步
- 存储任务状态到数据库
- 前端轮询或使用 WebSocket 获取进度

---

## 部署

### 生产运行
```bash
# 使用 Gunicorn + Uvicorn
pip install gunicorn

gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001 \
  --access-logfile - \
  --error-logfile -
```

### Docker 部署
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
ENV SERVICE_PORT=8001

EXPOSE 8001
CMD ["python", "main.py"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  ai-service:
    build: ./ai-service
    ports:
      - "8001:8001"
    environment:
      DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY}
    volumes:
      - ./ai-service:/app
```

---

## 性能优化

### 缓存 Prompt 结果
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def generate_lesson(subject, teaching_goal):
    # 避免重复调用 API
    pass
```

### 批量生成
- 使用线程池或 asyncio 并发调用
- 设置合理的 API Rate Limit
- 监控成本

### 监控指标
- 请求成功率
- 平均响应时间
- API 调用成本
- 生成内容质量

---

## 下一步

- 详细架构: [ai-service/ARCHITECTURE.md](../ai-service/ARCHITECTURE.md)
- LLM 集成: [ai-service/LLM-INTEGRATION.md](../ai-service/LLM-INTEGRATION.md)
- Prompt 设计: [ai-service/PROMPT-DESIGN.md](../ai-service/PROMPT-DESIGN.md)
- 项目状态: [00-PROJECT-STATUS.md](../00-PROJECT-STATUS.md)

---

## 获得帮助

- **文档导航**: [docs/README.md](./README.md)
- **项目状态**: [00-PROJECT-STATUS.md](./00-PROJECT-STATUS.md)
- **常见问题**: 本文档的"常见问题"部分
- **FastAPI 文档**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **阿里 DashScope**: [dashscope.aliyun.com](https://dashscope.aliyun.com)
