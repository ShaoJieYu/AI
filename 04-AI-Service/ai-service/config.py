import os
from dotenv import load_dotenv

# Clear system proxy settings that may prevent direct connection to DashScope
for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
    os.environ.pop(key, None)

# Ensure DashScope endpoint bypasses any remaining proxy
no_proxy = os.environ.get('NO_PROXY', '')
if 'dashscope.aliyuncs.com' not in no_proxy:
    os.environ['NO_PROXY'] = f"{no_proxy},dashscope.aliyuncs.com" if no_proxy else 'dashscope.aliyuncs.com'

load_dotenv()

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
AI_MODEL = "qwen-plus"
SERVICE_PORT = 8001

# ============================================================
# LLM Provider 切换配置（云端通义千问 / 本地 Ollama）
# ============================================================
# LLM_PROVIDER: "cloud" 用通义千问 qwen-plus（默认，质量高，耗 token）
#               "local"  用本地 Ollama qwen2.5:7b（零 token 成本，质量略低）
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "cloud")

# Ollama 本地模型配置
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

# ============================================================
# 测试模式开关（节约端到端测试时间）
# ============================================================
# TEST_MODE: "true" 启用测试模式（每段 200-300 字，总 1000-1500 字，5 倍提速）
#            "false" 正式模式（每段 800-1000 字，总 4000-5000 字，默认）
# 用途：test_l3_*.py 脚本自动开启，避免在调试时长时间等待内容生成
# 关闭方式：export TEST_MODE=false 或 unset TEST_MODE
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"

# ============================================================
# 阶段 2：RAG 检索增强配置
# ============================================================
# Chroma 向量库持久化目录（相对 AI 服务根目录）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DB_PATH = os.path.join(BASE_DIR, "data", "chroma_db")
TEXTBOOK_PDF_DIR = os.path.join(BASE_DIR, "data", "textbooks")
