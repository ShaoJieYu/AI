"""
通义千问 LLM 调用封装

阶段 4 的 Multi-Agent 系统通过本模块统一调用通义千问 qwen-plus 模型，
不直接依赖 dashscope.Generation.call，便于：
1. 统一管理模型参数（model、max_tokens、response_format）
2. 统一清理代理环境变量（遵循 project_memory 约束）
3. 支持工具调用（Function Calling）和结构化 JSON 输出
4. 后续可扩展为异步调用

阶段 3 的 agent/agent_core.py 保持原样，不强制改用本模块。
"""
import os
import json
import dashscope
from dashscope import Generation
from config import DASHSCOPE_API_KEY
from typing import List, Dict, Optional, Any

# 初始化 dashscope api_key（config.py 已清理代理环境变量）
dashscope.api_key = DASHSCOPE_API_KEY

# 模型常量
DEFAULT_MODEL = "qwen-plus"


class QwenPlusLLM:
    """
    通义千问 qwen-plus 封装类。

    提供 chat() 和 chat_with_tools() 两个核心方法：
    - chat(): 纯文本对话，支持 JSON 输出
    - chat_with_tools(): 带工具调用的对话（Function Calling）

    用法示例：
        from common.llm import qwen_plus

        # 纯文本对话
        response = qwen_plus.chat(
            messages=[{"role": "user", "content": "你好"}],
            max_tokens=2048
        )

        # 带工具调用
        response = qwen_plus.chat_with_tools(
            messages=messages,
            tools=tools_schema
        )
    """

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model

    def chat(
        self,
        messages: List[Dict],
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """
        纯文本对话（不带工具调用）。

        参数：
            messages: 消息列表 [{"role": "system"/"user"/"assistant", "content": "..."}]
            max_tokens: 最大输出 token 数（阶段 4 各 Agent 按需设置）
            response_format: 输出格式控制，如 {"type": "json_object"} 强制 JSON 输出
            temperature: 采样温度，默认 0.7；质检 Agent 建议用 0.3 提高稳定性

        返回：
            {
                "success": True/False,
                "content": "模型输出文本",
                "raw_response": "原始 response 对象",
                "error": "失败时的错误信息"
            }
        """
        # 二次清理代理环境变量（防御性编程）
        for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
            os.environ.pop(key, None)

        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "result_format": "message",
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = Generation.call(**kwargs)

            if response.status_code != 200:
                return {
                    "success": False,
                    "content": "",
                    "raw_response": response,
                    "error": f"API 调用失败: {response.message}"
                }

            content = response.output.choices[0].message.get("content", "")
            return {
                "success": True,
                "content": content,
                "raw_response": response,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "content": "",
                "raw_response": None,
                "error": f"LLM 调用异常: {str(e)}"
            }

    def chat_with_tools(
        self,
        messages: List[Dict],
        tools: List[Dict],
        max_tokens: int = 4096,
        tool_choice: str = "auto",
    ) -> Dict[str, Any]:
        """
        带工具调用的对话（Function Calling）。

        参数：
            messages: 消息列表
            tools: 工具 schema 列表（通义千问 tools 格式）
            max_tokens: 最大输出 token 数
            tool_choice: 工具选择策略，"auto" 让模型自主决策

        返回：
            {
                "success": True/False,
                "content": "模型文本输出（可能为空）",
                "tool_calls": [{"id": "...", "function": {"name": "...", "arguments": "..."}}],
                "raw_response": "原始 response 对象",
                "error": "失败时的错误信息"
            }
        """
        for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
            os.environ.pop(key, None)

        try:
            response = Generation.call(
                model=self.model,
                messages=messages,
                tools=tools,
                tool_choice=tool_choice,
                max_tokens=max_tokens,
                result_format="message",
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "content": "",
                    "tool_calls": [],
                    "raw_response": response,
                    "error": f"API 调用失败: {response.message}"
                }

            message = response.output.choices[0].message
            return {
                "success": True,
                "content": message.get("content", ""),
                "tool_calls": message.get("tool_calls", []),
                "raw_response": response,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "content": "",
                "tool_calls": [],
                "raw_response": None,
                "error": f"LLM 调用异常: {str(e)}"
            }


# 全局单例，供 multi_agent 模块直接导入使用
qwen_plus = QwenPlusLLM()
