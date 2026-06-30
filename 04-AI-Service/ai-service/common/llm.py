"""
LLM 调用封装（双 Provider 可切换）

支持两种 LLM 后端，通过 config.LLM_PROVIDER 切换：
1. cloud（默认）: 通义千问 qwen-plus（dashscope SDK，质量高，耗 token）
2. local: Ollama 本地模型 qwen2.5:7b（openai SDK，零 token 成本，离线可用）

设计模式：
- BaseLLM 抽象接口：定义 chat() / chat_with_tools() 两个方法
- QwenPlusLLM / OllamaLLM：两个具体实现
- get_llm() 工厂函数：读 config.LLM_PROVIDER 返回对应实例
- LLMRegistry 注册表：支持运行期热切换 + 持久化，替代原固定单例
- llm 代理对象：所有方法调用转发到注册表当前实例，向后兼容 7 处调用方代码

用法：
    from common.llm import llm
    response = llm.chat(messages=[...], max_tokens=2048)
    response = llm.chat_with_tools(messages=[...], tools=[...])

运行期热切换（无需重启服务）：
    from common.llm import registry
    registry.switch("local")   # 切到本地 Ollama
    registry.switch("cloud")   # 切回云端通义千问
"""
import os
import json
import threading
import dashscope
from dashscope import Generation
from typing import List, Dict, Optional, Any
from config import (
    DASHSCOPE_API_KEY,
    LLM_PROVIDER,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
)

# 初始化 dashscope api_key（config.py 已清理代理环境变量）
dashscope.api_key = DASHSCOPE_API_KEY

# 模型常量
DEFAULT_MODEL = "qwen-plus"


class BaseLLM:
    """
    LLM 抽象基类。

    所有 Provider 必须实现 chat() 和 chat_with_tools() 两个方法，
    返回格式统一为：
        {
            "success": True/False,
            "content": "模型输出文本",
            "tool_calls": [...],  # 仅 chat_with_tools 有
            "raw_response": "原始 response 对象",
            "error": "失败时的错误信息"
        }
    """

    def chat(
        self,
        messages: List[Dict],
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        raise NotImplementedError

    def chat_with_tools(
        self,
        messages: List[Dict],
        tools: List[Dict],
        max_tokens: int = 4096,
        tool_choice: str = "auto",
        response_format: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError


class QwenPlusLLM(BaseLLM):
    """
    通义千问 qwen-plus 封装（云端）。

    通过 dashscope SDK 调用，原生支持 Function Calling 和 JSON 输出。
    质量高但耗 token，适合正式演示和生产环境。
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
        # 二次清理代理环境变量（防御性编程，遵循 project_memory 约束）
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
        response_format: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
            os.environ.pop(key, None)

        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "tools": tools,
                "tool_choice": tool_choice,
                "max_tokens": max_tokens,
                "result_format": "message",
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = Generation.call(**kwargs)

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


class OllamaLLM(BaseLLM):
    """
    Ollama 本地模型封装（通过原生 API /api/chat 调用）。

    使用 requests 直接调用 Ollama 原生端点，支持 think=False 关闭 qwen3.5 思考模式。
    （OpenAI 兼容端点 /v1/chat/completions 不支持 think 参数，必须用原生 API）

    优点：零 token 成本、完全离线、数据不出本机、支持关闭 thinking
    缺点：9B 模型在长文本生成质量上略逊于 qwen-plus
    """

    def __init__(self, model: str = OLLAMA_MODEL, base_url: str = OLLAMA_BASE_URL):
        # base_url 是 OpenAI 兼容端点（/v1），原生端点是 http://host:11434/api/chat
        # 从 base_url 推导原生 URL：去掉 /v1 后缀，加 /api/chat
        self.model = model
        self.openai_base_url = base_url
        # 原生 API 端点：http://127.0.0.1:11434/api/chat
        if "/v1" in base_url:
            self.native_base_url = base_url.replace("/v1", "")
        else:
            self.native_base_url = base_url.rstrip("/")
        self.native_chat_url = f"{self.native_base_url}/api/chat"
        # 延迟导入 requests
        import requests
        self._requests = requests

    def _clear_proxy(self):
        """清理代理环境变量，避免本地请求被代理拦截"""
        for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
            os.environ.pop(key, None)

    def _call_native(self, payload: Dict) -> Dict:
        """
        调用 Ollama 原生 API /api/chat。

        关键参数：
        - think: False —— 关闭 qwen3.5 thinking 模式，让 content 直接输出最终答案
          （thinking 模式下思考内容走 reasoning 字段，content 为空，会触发 JSON 解析失败）
        - stream: False —— 非流式返回完整结果
        - options.num_ctx: 32768 —— 扩大 context window（Ollama 默认 4096 太小，
          五段式内容生成需要 system prompt + 对话历史 + 5 段 800 字内容 ≈ 9000+ token）
        - options: 透传 max_tokens/temperature 等 Ollama 原生选项
        - format: "json" —— 当 response_format=json_object 时强制 JSON 输出

        消息格式修复：Ollama 原生 API 要求 assistant 消息的 tool_calls.function.arguments
        是 dict，但上游代码（ReAct 循环）期望 JSON 字符串（兼容 dashscope）。
        _normalize_tool_calls 把 arguments 转成了 JSON 字符串返回给上游，
        当上游把 assistant 消息喂回 Ollama 时需要转回 dict，否则 400 错误。
        """
        self._clear_proxy()
        # thinking 模式可配置：教学设计 Agent 开启（提升决策质量），
        # 内容生成 Agent 关闭（避免 content 为空 + 提升速度）
        # 优先读 payload 里的 think 参数（调用方可控制），默认 False
        if "think" not in payload:
            payload["think"] = False
        payload["stream"] = False

        # 扩大 context window：Ollama 默认 num_ctx=4096 太小，
        # 单段内容生成（800字 + system prompt + 教材检索结果）约需 4000-6000 token
        # 2 路并行时每路需独立 KV cache，8192 平衡显存与需求
        options = payload.get("options", {})
        options["num_ctx"] = 8192
        payload["options"] = options

        # 修复 messages 里 assistant 消息的 tool_calls arguments 格式
        # Ollama 原生 API 要求 arguments 是 dict，上游传的是 JSON 字符串
        import copy
        new_messages = copy.deepcopy(payload.get("messages", []))
        for msg in new_messages:
            if msg.get("role") == "assistant" and msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    func = tc.get("function", {})
                    args = func.get("arguments", "")
                    if isinstance(args, str) and args:
                        try:
                            func["arguments"] = json.loads(args)
                        except json.JSONDecodeError:
                            pass  # 保持原样，让 Ollama 报错暴露问题
        payload["messages"] = new_messages

        resp = self._requests.post(
            self.native_chat_url,
            json=payload,
            timeout=600,  # 本地模型生成五段式内容可能较慢，给 10 分钟
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def _normalize_tool_calls(raw_tool_calls: List[Dict]) -> List[Dict]:
        """
        将 Ollama 原生 API 的 tool_calls 格式统一为上游代码期望的格式。

        原生 API 返回：tool_calls[].function.arguments 是 dict
        上游期望：tool_calls[].function.arguments 是 JSON 字符串（兼容 dashscope 格式）
        """
        normalized = []
        for tc in raw_tool_calls or []:
            func = tc.get("function", {})
            args = func.get("arguments", {})
            # dict 转 JSON 字符串
            if isinstance(args, dict):
                args = json.dumps(args, ensure_ascii=False)
            normalized.append({
                "id": tc.get("id", ""),
                "function": {
                    "name": func.get("name", ""),
                    "arguments": args,
                }
            })
        return normalized

    def chat(
        self,
        messages: List[Dict],
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        try:
            # 本地 qwen3.5:9b 是思考模型，思考过程消耗大量 token，
            # 强制 max_tokens 至少 16384，避免 5 段内容生成时思考用完额度导致正文截断
            max_tokens = max(max_tokens, 16384)
            payload = {
                "model": self.model,
                "messages": messages,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                },
            }
            # response_format=json_object 时用 Ollama 原生 format 参数强制 JSON
            if response_format and response_format.get("type") == "json_object":
                payload["format"] = "json"

            data = self._call_native(payload)
            message = data.get("message", {})
            content = message.get("content", "") or ""

            return {
                "success": True,
                "content": content,
                "raw_response": data,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "content": "",
                "raw_response": None,
                "error": f"Ollama 调用异常: {str(e)}"
            }

    def chat_with_tools(
        self,
        messages: List[Dict],
        tools: List[Dict],
        max_tokens: int = 4096,
        tool_choice: str = "auto",
        response_format: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        try:
            # 本地 qwen3.5:9b 是思考模型，强制 max_tokens 至少 16384 避免截断
            max_tokens = max(max_tokens, 16384)
            payload = {
                "model": self.model,
                "messages": messages,
                "tools": tools,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.7,
                },
            }
            # tool_choice: "none" 强制不调用工具，"auto" 让模型自主决策
            # Ollama 原生 API 不支持 tool_choice 参数，通过移除 tools 实现 "none"
            if tool_choice == "none":
                payload.pop("tools", None)

            # response_format=json_object 时用 Ollama 原生 format 参数强制 JSON
            if response_format and response_format.get("type") == "json_object":
                payload["format"] = "json"

            # thinking 模式开关：调用方可通过 _thinking_override 临时切换
            # _call_native 优先读 payload["think"]，没设才用默认值 False
            override = getattr(self, "_thinking_override", None)
            if override is not None:
                payload["think"] = override

            data = self._call_native(payload)
            message = data.get("message", {})
            content = message.get("content", "") or ""
            tool_calls = self._normalize_tool_calls(message.get("tool_calls", []))

            return {
                "success": True,
                "content": content,
                "tool_calls": tool_calls,
                "raw_response": data,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "content": "",
                "tool_calls": [],
                "raw_response": None,
                "error": f"Ollama 调用异常: {str(e)}"
            }


def get_llm(provider: Optional[str] = None) -> BaseLLM:
    """
    LLM 工厂函数。

    根据 provider 参数返回对应的 LLM 实例：
    - "cloud": 返回 QwenPlusLLM（通义千问 qwen-plus）
    - "local": 返回 OllamaLLM（Ollama qwen2.5:7b）

    参数：
        provider: 指定 provider，None 时读 config.LLM_PROVIDER 默认值
    """
    p = (provider or LLM_PROVIDER).lower().strip()
    if p == "local":
        return OllamaLLM()
    else:
        return QwenPlusLLM()


# ============================================================
# LLMRegistry：运行期热切换注册表
# ============================================================
# 持久化文件路径（存当前 provider，AI 服务重启后仍记住上次选择）
from config import BASE_DIR
_RUNTIME_FILE = os.path.join(BASE_DIR, ".runtime_llm.json")

# 可用 provider 列表（供前端 UI 渲染选项）
AVAILABLE_PROVIDERS = {
    "cloud": {
        "label": "云端模型（通义千问 qwen-plus）",
        "description": "质量高，耗 token，需联网",
    },
    "local": {
        "label": "本地模型（Ollama qwen3.5:9b）",
        "description": "零 token 成本，离线可用，多模态 + agent 能力强",
    },
}


def _load_persisted_provider() -> str:
    """从持久化文件读取上次选择的 provider，失败时回退到 .env 默认值"""
    try:
        if os.path.exists(_RUNTIME_FILE):
            with open(_RUNTIME_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                p = data.get("provider", "").lower().strip()
                if p in AVAILABLE_PROVIDERS:
                    return p
    except Exception:
        pass
    return LLM_PROVIDER.lower().strip()


def _persist_provider(provider: str) -> None:
    """把当前 provider 写入持久化文件"""
    try:
        with open(_RUNTIME_FILE, "w", encoding="utf-8") as f:
            json.dump({"provider": provider}, f, ensure_ascii=False, indent=2)
    except Exception:
        pass  # 持久化失败不影响热切换功能本身


class LLMRegistry:
    """
    LLM 注册表：支持运行期热切换 + 持久化。

    - 内部持有可变的 _current 引用，switch() 时替换实例
    - get() 返回当前 LLM 实例
    - current_provider() 返回当前 provider 名称
    - 线程安全：用 threading.Lock 保护 _current 切换

    设计权衡：
    - 不用重新 import：所有调用方 `from common.llm import llm` 拿到的是代理对象，
      代理对象每次调用都转发到 registry.get()，所以切换后所有调用方立即生效
    - 持久化用 JSON 文件：AI 服务是独立 Python 进程不连 MySQL，文件最简单
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._current: BaseLLM = None
        self._current_provider: str = ""
        # 启动时读持久化文件，没有就用 .env 默认值
        initial_provider = _load_persisted_provider()
        self._current = get_llm(initial_provider)
        self._current_provider = initial_provider
        print(f"[LLMRegistry] 初始化 provider={initial_provider}")

    def get(self) -> BaseLLM:
        """返回当前 LLM 实例"""
        with self._lock:
            return self._current

    def current_provider(self) -> str:
        """返回当前 provider 名称（cloud / local）"""
        with self._lock:
            return self._current_provider

    def switch(self, provider: str) -> bool:
        """
        热切换 LLM provider。

        参数：
            provider: "cloud" 或 "local"

        返回：
            True=切换成功，False=provider 非法
        """
        p = provider.lower().strip()
        if p not in AVAILABLE_PROVIDERS:
            return False

        with self._lock:
            # 同名 provider 不重复创建实例
            if p == self._current_provider:
                return True
            self._current = get_llm(p)
            self._current_provider = p

        # 锁外持久化（避免 IO 阻塞锁）
        _persist_provider(p)
        print(f"[LLMRegistry] 已切换 provider={p}")
        return True


# 全局注册表单例
registry = LLMRegistry()


# ============================================================
# Agent 级别 LLM 路由
# ============================================================
# 设计原因：
# - 教学设计 Agent 用 ReAct 循环（多轮工具调用 + 决策），4b 决策能力弱必失败
#   → 强制用 9b（实测可用）
# - 内容生成 Agent 是 5 段并行生成，4b 质量稳定 + 速度比 9b 快
# - 质检 Agent 是单次 LLM 调用，4b 足够
# - 导出 Agent 是单次 LLM 调用 + 排版优化，4b/9b 都可以，跟随默认
#
# 值为 None 表示用 registry.current() 的默认实例（随 .env / 热切换变化）
AGENT_MODEL_OVERRIDE = {
    "teaching_design": "qwen3.5:9b",  # 强制 9b（ReAct 决策需要大模型）
    "content_generation": None,         # 走 registry 默认（.env 控制，4b 2路）
    "qa": "qwen3.5:4b",                # 单次调用，4b 够用
    "export": None,                     # 走 registry 默认
}


def get_agent_llm(agent_name: str) -> BaseLLM:
    """
    返回指定 agent 专属的 LLM 代理。

    用法（替代直接 `from common.llm import llm`）：
        from common.llm import get_agent_llm
        llm = get_agent_llm("teaching_design")
        response = llm.chat(messages=[...])

    优势：
    - 每次调用动态转发到 registry.get_for_agent(agent_name)
    - 热切换 provider 后，per-agent 缓存自动失效
    - agent 业务代码不需要感知模型选择策略
    """
    return _AgentLLMProxy(agent_name)


# ============================================================
# 扩展 LLMRegistry：per-agent LLM 实例缓存
# ============================================================
def _registry_init_with_agent_cache(self):
    """LLMRegistry.__init__ 扩展版，初始化 per-agent 缓存"""
    self._lock = threading.Lock()
    self._current: BaseLLM = None
    self._current_provider: str = ""
    # per-agent 实例缓存：key=(agent_name, model) → BaseLLM
    # 切换 provider 时清空（cloud ↔ local 不可混用）
    self._agent_instances: Dict[tuple, BaseLLM] = {}
    initial_provider = _load_persisted_provider()
    self._current = get_llm(initial_provider)
    self._current_provider = initial_provider
    print(f"[LLMRegistry] 初始化 provider={initial_provider}")


def _registry_get_for_agent(self, agent_name: str) -> BaseLLM:
    """
    根据 agent 名称返回专属 LLM 实例。

    - AGENT_MODEL_OVERRIDE[agent_name] = None → 用 registry 当前默认实例
    - AGENT_MODEL_OVERRIDE[agent_name] = "model_name" → 用专属模型实例（local provider）
    - 缓存：同一 (agent_name, model) 复用同一实例，避免重复创建
    """
    with self._lock:
        override = AGENT_MODEL_OVERRIDE.get(agent_name)
        if self._current_provider == "local" and override:
            cache_key = (agent_name, override)
            if cache_key not in self._agent_instances:
                self._agent_instances[cache_key] = OllamaLLM(model=override)
            return self._agent_instances[cache_key]
        return self._current


def _registry_switch_clear_cache(self, provider: str) -> bool:
    """LLMRegistry.switch 扩展版，切换时清空 per-agent 缓存"""
    p = provider.lower().strip()
    if p not in AVAILABLE_PROVIDERS:
        return False

    with self._lock:
        if p == self._current_provider:
            return True
        self._current = get_llm(p)
        self._current_provider = p
        # 清空 per-agent 缓存：cloud/local 的 LLM 实例不可混用
        self._agent_instances.clear()

    _persist_provider(p)
    print(f"[LLMRegistry] 已切换 provider={p}")
    return True


# 替换原方法（monkey patch 风格避免破坏已有 LLMRegistry 定义）
LLMRegistry.__init__ = _registry_init_with_agent_cache
LLMRegistry.get_for_agent = _registry_get_for_agent
LLMRegistry.switch = _registry_switch_clear_cache
# 重新初始化已存在的 registry 实例（让它的 __init__ 走新版本）
registry.__init__()


class _LLMProxy(BaseLLM):
    """
    LLM 代理对象：所有方法调用转发到 registry.get() 当前实例。

    这样 `from common.llm import llm` 拿到的对象在热切换后无需重新 import，
    每次调用 chat() / chat_with_tools() 都会动态解析到最新 provider。
    """

    def chat(self, *args, **kwargs):
        return registry.get().chat(*args, **kwargs)

    def chat_with_tools(self, *args, **kwargs):
        return registry.get().chat_with_tools(*args, **kwargs)


class _AgentLLMProxy(BaseLLM):
    """
    Per-agent LLM 代理对象：所有方法调用转发到 registry.get_for_agent(agent_name)。

    这样 agent 业务代码 `llm = get_agent_llm("teaching_design"); llm.chat(...)`
    拿到的对象在热切换 provider 后会自动重新解析，无需重新 import。

    与 _LLMProxy 的区别：
    - _LLMProxy 永远用 registry 默认实例（registry.get()）
    - _AgentLLMProxy 按 agent 名称路由到专属实例（registry.get_for_agent(agent_name)）
    """

    def __init__(self, agent_name: str):
        self._agent_name = agent_name

    def chat(self, *args, **kwargs):
        return registry.get_for_agent(self._agent_name).chat(*args, **kwargs)

    def chat_with_tools(self, *args, **kwargs):
        return registry.get_for_agent(self._agent_name).chat_with_tools(*args, **kwargs)


# 全局代理对象（替代原固定单例 llm）
# 调用方代码 `from common.llm import llm; llm.chat(...)` 完全不用改
llm = _LLMProxy()
# 保留 qwen_plus 作为向后兼容别名，避免破坏 agent/ 阶段 1-3 代码
qwen_plus = llm  # 向后兼容别名
