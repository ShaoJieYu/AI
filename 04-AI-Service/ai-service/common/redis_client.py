"""
Redis 客户端

阶段 4 的 Multi-Agent 工作流用 Redis 持久化 State，防止页面刷新丢失。
连接后端同一 Redis 实例（localhost:6379），key 命名空间隔离：
- 后端 ConversationService: conversation:{session_id}
- AI 服务 Multi-Agent:    multi_agent:{session_id}

依赖：redis-py 库（requirements.txt 新增）
"""
import os
import json
from typing import Optional, Any
from config import BASE_DIR

# Redis 连接配置（与后端 application.yml 保持一致）
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# Multi-Agent State 的 TTL（24 小时，与后端会话记忆保持一致）
MULTI_AGENT_STATE_TTL = 86400

# key 前缀
MULTI_AGENT_KEY_PREFIX = "multi_agent:"


# 延迟初始化的全局客户端
_redis_client = None


def get_redis_client():
    """
    获取 Redis 客户端单例。

    延迟初始化：第一次调用时才连接，避免模块导入时就失败
    （开发环境可能没装 redis 或没启动 Redis 服务）。
    """
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        import redis
        _redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD if REDIS_PASSWORD else None,
            db=REDIS_DB,
            decode_responses=True,  # 自动把 bytes 解码为 str
            socket_connect_timeout=5,
            socket_timeout=5,
            protocol=2,  # 强制使用 RESP2 协议（本地 Redis 3.0.504 不支持 RESP3 的 HELLO 命令）
        )
        # 测试连接
        _redis_client.ping()
        print(f"[Redis] 连接成功: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB} (RESP2)")
        return _redis_client
    except ImportError:
        print("[Redis] 警告：redis 库未安装，Multi-Agent 持久化功能不可用")
        return None
    except Exception as e:
        print(f"[Redis] 连接失败: {str(e)}")
        _redis_client = None
        return None


def save_multi_agent_state(session_id: str, state: dict) -> bool:
    """
    保存 Multi-Agent 工作流的 State 到 Redis。

    参数：
        session_id: 会话 ID
        state: 完整的 LessonPlanState 字典

    返回：
        True 表示保存成功，False 表示失败（Redis 不可用或序列化错误）
    """
    client = get_redis_client()
    if client is None:
        return False

    try:
        key = f"{MULTI_AGENT_KEY_PREFIX}{session_id}"
        # ensure_ascii=False 保留中文可读性，default=str 兜底不可序列化对象
        value = json.dumps(state, ensure_ascii=False, default=str)
        client.setex(key, MULTI_AGENT_STATE_TTL, value)
        return True
    except Exception as e:
        print(f"[Redis] 保存 State 失败: {str(e)}")
        return False


def load_multi_agent_state(session_id: str) -> Optional[dict]:
    """
    从 Redis 加载 Multi-Agent 工作流的 State（断线恢复用）。

    参数：
        session_id: 会话 ID

    返回：
        State 字典，如果不存在或 Redis 不可用则返回 None
    """
    client = get_redis_client()
    if client is None:
        return None

    try:
        key = f"{MULTI_AGENT_KEY_PREFIX}{session_id}"
        value = client.get(key)
        if value is None:
            return None
        return json.loads(value)
    except Exception as e:
        print(f"[Redis] 加载 State 失败: {str(e)}")
        return None


def delete_multi_agent_state(session_id: str) -> bool:
    """
    删除 Multi-Agent 工作流的 State。

    参数：
        session_id: 会话 ID

    返回：
        True 表示删除成功
    """
    client = get_redis_client()
    if client is None:
        return False

    try:
        key = f"{MULTI_AGENT_KEY_PREFIX}{session_id}"
        client.delete(key)
        return True
    except Exception as e:
        print(f"[Redis] 删除 State 失败: {str(e)}")
        return False
