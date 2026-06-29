"""
SSE 事件推送器

阶段 4 的 Multi-Agent 工作流通过 SSE（Server-Sent Events）实时推送
Agent 执行进度给前端。本模块提供事件推送的统一入口。

工作原理：
1. 每个 SSE 连接对应一个 asyncio.Queue
2. Agent 节点执行时调用 emit() 推送事件到队列
3. FastAPI 的 StreamingResponse 从队列读取事件推给客户端

事件类型：
- agent_start: Agent 开始执行
- agent_complete: Agent 执行完成
- qa_reject: 质检打回
- workflow_complete: 工作流完成
- agent_error: Agent 执行错误
"""
import asyncio
import json
from typing import Dict, Optional, Any
from datetime import datetime


# 全局事件队列注册表：session_id -> asyncio.Queue
# 每个活跃的 SSE 连接对应一个队列
_event_queues: Dict[str, asyncio.Queue] = {}


def register_queue(session_id: str) -> asyncio.Queue:
    """
    为指定 session 注册一个事件队列。

    在 SSE 端点建立连接时调用，工作流执行时通过 emit() 推送事件到这个队列。

    参数：
        session_id: 会话 ID

    返回：
        asyncio.Queue 实例
    """
    if session_id not in _event_queues:
        _event_queues[session_id] = asyncio.Queue()
    return _event_queues[session_id]


def unregister_queue(session_id: str) -> None:
    """
    注销事件队列（SSE 连接关闭时调用）。

    参数：
        session_id: 会话 ID
    """
    _event_queues.pop(session_id, None)


def get_queue(session_id: str) -> Optional[asyncio.Queue]:
    """获取指定 session 的事件队列，不存在则返回 None。"""
    return _event_queues.get(session_id)


async def emit(session_id: str, event: Dict[str, Any]) -> bool:
    """
    推送一个事件到指定 session 的事件队列。

    Agent 节点执行时调用本函数推送进度事件。
    如果对应 session 没有活跃的 SSE 连接，事件会被丢弃（不报错）。

    参数：
        session_id: 会话 ID
        event: 事件字典，必须包含 "type" 字段

    返回：
        True 表示推送成功，False 表示没有活跃连接
    """
    queue = get_queue(session_id)
    if queue is None:
        # 没有活跃的 SSE 连接，事件丢弃（工作流仍可继续，只是前端看不到）
        return False

    # 补充时间戳（如果事件未提供）
    if "timestamp" not in event:
        event["timestamp"] = datetime.now().isoformat()

    await queue.put(event)
    return True


def format_sse_event(event: Dict[str, Any]) -> str:
    """
    把事件字典格式化为 SSE 协议字符串。

    SSE 协议格式：data: {json}\n\n

    参数：
        event: 事件字典

    返回：
        SSE 格式字符串
    """
    return f"data: {json.dumps(event, ensure_ascii=False, default=str)}\n\n"


# ============================================================
# 便捷事件构造函数（Agent 节点直接调用）
# ============================================================

def make_agent_start_event(agent_name: str, input_summary: str) -> Dict[str, Any]:
    """构造 agent_start 事件。"""
    return {
        "type": "agent_start",
        "agent": agent_name,
        "input_summary": input_summary,
    }


def make_agent_complete_event(
    agent_name: str,
    output_summary: str,
    react_trace: list = None,
    duration_ms: int = 0,
) -> Dict[str, Any]:
    """构造 agent_complete 事件。"""
    return {
        "type": "agent_complete",
        "agent": agent_name,
        "output_summary": output_summary,
        "react_trace": react_trace or [],
        "duration_ms": duration_ms,
    }


def make_qa_reject_event(
    issue_type: str,
    issues: list,
    retry_count: int,
    route_to: str,
) -> Dict[str, Any]:
    """构造 qa_reject 事件（质检打回）。"""
    return {
        "type": "qa_reject",
        "agent": "qa",
        "issue_type": issue_type,
        "issues": issues,
        "retry_count": retry_count,
        "route_to": route_to,
    }


def make_workflow_complete_event(final_state: Dict[str, Any]) -> Dict[str, Any]:
    """构造 workflow_complete 事件。"""
    return {
        "type": "workflow_complete",
        "final_state": final_state,
    }


def make_agent_error_event(agent_name: str, error: str) -> Dict[str, Any]:
    """构造 agent_error 事件。"""
    return {
        "type": "agent_error",
        "agent": agent_name,
        "error": error,
    }
