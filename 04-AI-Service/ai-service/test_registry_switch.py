"""
用 registry.switch() 正式 API 测试热切换
"""
import os, sys
for k in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
    os.environ.pop(k, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common.llm import registry
from multi_agent.agents.content_generation import get_max_workers_for_model


def show():
    inst = registry.get()
    provider = registry.current_provider()
    model = getattr(inst, "model", "qwen-plus")
    if provider == "local":
        w = get_max_workers_for_model(model)
    else:
        w = 5
    print(f"  provider={provider} | model={model} | max_workers={w}")
    return w


print("=== registry.switch('local')  切换测试 ===")
print()
print("1. 切到 local（默认 2b）")
registry.switch("local")
w1 = show()
assert w1 == 2

# 模拟切换不同模型（直接换 instance，不通过 switch 因为 switch 不接 model 参数）
from common.llm import OllamaLLM
print()
print("2. 换 4b 模型（同一 provider 内）")
registry._current = OllamaLLM(model="qwen3.5:4b")
w2 = show()
assert w2 == 2

print()
print("3. 换 9b 模型")
registry._current = OllamaLLM(model="qwen3.5:9b")
w3 = show()
assert w3 == 1

print()
print("4. 切到 cloud（通过 switch API）")
registry.switch("cloud")
w4 = show()
assert w4 == 5

print()
print("5. 再切回 local（验证持久化不影响）")
registry.switch("local")
w5 = show()
assert w5 == 2

print()
print("✅ registry.switch() + 模型动态替换 全部正确")
