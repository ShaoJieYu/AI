"""
Multi-Agent 多智能体协作系统（阶段 4）

基于 LangGraph 工作流编排的 4 Agent 协作备课系统：
- 教学设计 Agent（ReAct）：拆解教学目标，输出五段式骨架
- 内容生成 Agent（ReAct）：基于教学设计 + RAG 检索生成五段式内容
- 质检 Agent（Function Calling）：三维评分（准确性/排版/公式），不合格分级打回
- 导出 Agent（纯 LLM）：排版优化 + PDF 导出

模块结构：
- state.py: LangGraph 全局共享 State 定义
- schema.py: 4 个 Agent 输出的 pydantic 校验模型
- prompts.py: 4 个 Agent 的 prompt 模板（含 few-shot 示例）
- react_loop.py: 轻量 ReAct 主循环实现
- agents/: 4 个 Agent 实现
- workflow.py: LangGraph 工作流编排（含条件路由和打回循环）
- persistence.py: Redis 持久化 + SSE 事件推送装饰器
"""
