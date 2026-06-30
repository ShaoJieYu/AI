"""
快速摸底测试：测当前 2b 模型实际速度
"""
import requests
import time
import json
import os

# 释放所有模型
for m in ["qwen3.5:4b", "qwen3.5:9b", "qwen3.5:2b"]:
    try:
        requests.post("http://localhost:11434/api/generate", json={"model": m, "keep_alive": 0, "prompt": ""}, timeout=10)
    except Exception:
        pass
time.sleep(2)

# 测试 2b 短文本生成速度
print("=" * 60)
print("测试 2b 模型速度（800字生成模拟）")
print("=" * 60)
prompt_short = "请用 800 字左右介绍圆周运动的定义、线速度、角速度、周期、频率五个基本物理量，并给出生活中的应用例子。语言要通俗易懂，适合高中物理课堂教学。"

t0 = time.perf_counter()
r = requests.post("http://localhost:11434/api/generate", json={
    "model": "qwen3.5:2b",
    "prompt": prompt_short,
    "stream": False,
    "think": False,
    "options": {"num_predict": 1600, "num_ctx": 8192, "temperature": 0.7}
}, timeout=300).json()
t_total = time.perf_counter() - t0

eval_count = r.get("eval_count", 0)
eval_dur = r.get("eval_duration", 1) / 1e9
ollama_tps = eval_count / eval_dur if eval_dur > 0 else 0
content = r.get("response", "")

print(f"单段 800 字模拟:")
print(f"  实际 tokens: {eval_count}")
print(f"  Ollama eval 用时: {eval_dur:.1f}s")
print(f"  Ollama t/s: {ollama_tps:.1f}")
print(f"  Wall 总用时: {t_total:.1f}s")
print(f"  生成内容字数: {len(content)}")
print(f"  内容预览: {content[:150]}")
print()

# 5 段并发模拟：5 段同时跑，模拟 5-way parallel
print("=" * 60)
print("5 路并发模拟（5 段同时跑 800 字）")
print("=" * 60)

from concurrent.futures import ThreadPoolExecutor, as_completed

def gen_one(idx):
    t_s = time.perf_counter()
    r = requests.post("http://localhost:11434/api/generate", json={
        "model": "qwen3.5:2b",
        "prompt": f"请用 800 字左右介绍物理课教学中的第 {idx} 个板块（核心定义/教学分析/易错点/提分技巧/例题推导）的讲解要点。",
        "stream": False,
        "think": False,
        "options": {"num_predict": 1600, "num_ctx": 8192, "temperature": 0.7}
    }, timeout=300).json()
    return idx, time.perf_counter() - t_s, r.get("eval_count", 0), r.get("response", "")

t0 = time.perf_counter()
results = []
with ThreadPoolExecutor(max_workers=5) as ex:
    futs = [ex.submit(gen_one, i) for i in range(1, 6)]
    for f in as_completed(futs):
        results.append(f.result())
total = time.perf_counter() - t0
results.sort()
print(f"5 段并发总耗时: {total:.1f}s")
for idx, dur, tokens, content in results:
    print(f"  段{idx}: {dur:.1f}s, {tokens} tokens, {len(content)} 字")
print(f"  总生成字数: {sum(len(r[3]) for r in results)}")
print(f"  加速比（vs 串行 5*{results[-1][1]:.1f}s={5*results[-1][1]:.1f}s）: {5*results[-1][1]/total:.2f}x")
