"""
共享层（common/）

阶段 4 新增的共享组件，供 multi_agent/ 和未来其他模块复用。
阶段 3 的 agent/ 目录保持原样，不受影响。

模块：
- llm.py: 通义千问 LLM 调用封装（QwenPlusLLM）
- redis_client.py: Redis 客户端（连接后端同一 Redis 实例）
- event_emitter.py: SSE 事件推送器（Multi-Agent 工作流实时推送）
"""
