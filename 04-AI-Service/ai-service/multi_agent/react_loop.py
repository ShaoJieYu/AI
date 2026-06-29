"""
轻量 ReAct 主循环

ReAct = Reasoning + Acting，核心是 Thought/Action/Observation 循环：
1. Thought：模型思考下一步该做什么
2. Action：模型决定调用哪个工具
3. Observation：工具执行结果喂回模型
4. 重复 1-3，直到模型给出 Final Answer

本模块实现轻量版 ReAct，不依赖 LangChain Agent，更可控、更易调试。
通过 common.llm.qwen_plus.chat_with_tools() 调用通义千问。

trace 记录每一步，供前端可视化展示 Agent 思考过程。
"""
import json
from typing import List, Dict, Optional, Any
from common.llm import qwen_plus
from multi_agent.tools import execute_multi_agent_tool, extract_unit_from_text


class ReActLoop:
    """
    轻量 ReAct 主循环。

    用法：
        react = ReActLoop(
            system_prompt=TEACHING_DESIGN_PROMPT,
            tools=TEACHING_DESIGN_TOOLS,
            max_iterations=5
        )
        result = react.run("帮我准备一节物理课，主题是静电场")
        # result = {"answer": "...", "trace": [...]}
    """

    def __init__(
        self,
        system_prompt: str,
        tools: List[Dict],
        max_iterations: int = 5,
        token: str = None,
    ):
        self.system_prompt = system_prompt
        self.tools = tools
        self.max_iterations = max_iterations
        self.token = token
        self.trace: List[Dict[str, Any]] = []
        self.unit_hint: Optional[int] = None  # 程序化提取的 Unit 编号（兜底用）

    def run(self, user_input: str, context: str = "") -> Dict[str, Any]:
        """
        执行 ReAct 循环。

        参数：
            user_input: 用户输入（如"帮我准备一节物理课"）
            context: 额外上下文（如学生信息、质检反馈等）

        返回：
            {
                "success": True/False,
                "answer": "模型最终回答（JSON 字符串或纯文本）",
                "trace": [每一步的 Thought/Action/Observation 记录],
                "error": "失败时的错误信息"
            }
        """
        # 重置 trace（每次 run 都是独立的）
        self.trace = []

        # 程序化兜底：从 user_input + context 提取 Unit 编号
        # 防止 LLM 漏传 unit 参数导致检索到前言/目录等无关内容
        combined_text = user_input or ""
        if context:
            combined_text = f"{combined_text}\n{context}"
        self.unit_hint = extract_unit_from_text(combined_text)
        if self.unit_hint:
            print(f"[ReAct 兜底] 从输入提取到 Unit={self.unit_hint}，将用于 search_textbook 自动注入")

        # 构造初始消息列表
        messages = [
            {"role": "system", "content": self.system_prompt},
        ]

        # 用户消息（含上下文）
        user_content = user_input
        if context:
            user_content = f"{user_input}\n\n【上下文】\n{context}"
        messages.append({"role": "user", "content": user_content})

        for i in range(self.max_iterations):
            # 第 1 步：调用 LLM，带上工具列表
            # max_tokens=8192：五段式内容量大，4096 会截断（项目硬约束）
            response = qwen_plus.chat_with_tools(
                messages=messages,
                tools=self.tools,
                max_tokens=8192,
            )

            if not response["success"]:
                error_msg = f"LLM 调用失败（第{i+1}轮）: {response['error']}"
                self.trace.append({
                    "step": i + 1,
                    "type": "error",
                    "content": error_msg,
                })
                return {
                    "success": False,
                    "answer": "",
                    "trace": self.trace,
                    "error": error_msg,
                }

            tool_calls = response.get("tool_calls", [])
            content = response.get("content", "")

            # 第 2 步：检查模型是调工具还是给最终答案
            if not tool_calls:
                # 模型给出最终答案（没有 tool_calls）
                self.trace.append({
                    "step": i + 1,
                    "type": "final_answer",
                    "content": content[:500] + "..." if len(content) > 500 else content,
                })
                return {
                    "success": True,
                    "answer": content,
                    "trace": self.trace,
                    "error": None,
                }

            # 模型要调工具（情况 A）
            # 先把 assistant 消息（含 tool_calls）加入 messages
            assistant_msg = {"role": "assistant", "content": content, "tool_calls": tool_calls}
            messages.append(assistant_msg)

            # 记录 Thought（content 可能包含思考过程）
            if content:
                self.trace.append({
                    "step": i + 1,
                    "type": "thought",
                    "content": content[:300] + "..." if len(content) > 300 else content,
                })

            # 第 3 步：执行每个工具调用
            for tool_call in tool_calls:
                func_name = tool_call["function"]["name"]
                func_args_str = tool_call["function"]["arguments"]
                tool_call_id = tool_call.get("id", "")

                # 解析参数
                try:
                    func_args = json.loads(func_args_str)
                except json.JSONDecodeError:
                    func_args = {}

                # 记录 Action
                self.trace.append({
                    "step": i + 1,
                    "type": "action",
                    "name": func_name,
                    "input": func_args,
                })

                # 执行工具（传入 unit_hint 用于 search_textbook 自动兜底）
                result = execute_multi_agent_tool(
                    func_name, func_args, token=self.token, unit_hint=self.unit_hint
                )

                # 记录 Observation
                self.trace.append({
                    "step": i + 1,
                    "type": "observation",
                    "content": result[:500] + "..." if len(result) > 500 else result,
                })

                # 把工具结果喂回模型（通义千问要求 role=tool + name + tool_call_id）
                messages.append({
                    "role": "tool",
                    "content": result,
                    "name": func_name,
                    "tool_call_id": tool_call_id,
                })

            # 继续循环，让模型看到工具结果后决定下一步

        # 超过最大迭代次数
        error_msg = f"ReAct 循环超过 {self.max_iterations} 次未给出最终答案"
        self.trace.append({
            "step": self.max_iterations,
            "type": "error",
            "content": error_msg,
        })
        return {
            "success": False,
            "answer": "",
            "trace": self.trace,
            "error": error_msg,
        }
