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
