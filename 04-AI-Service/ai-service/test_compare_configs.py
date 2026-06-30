"""
对比测试：2b 5路 / 4b 2路 / 4b 1路 / 9b 1路
每个配置生成 5 段 800字内容，测总耗时 + 总字数 + 平均 t/s
"""
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA = "http://localhost:11434/api/generate"

def release_all():
    for m in ["qwen3.5:2b", "qwen3.5:4b", "qwen3.5:9b"]:
        try:
            requests.post(OLLAMA, json={"model": m, "keep_alive": 0, "prompt": ""}, timeout=10)
        except Exception:
            pass
    time.sleep(3)

def gen_one(model, idx, max_workers_label):
    t_s = time.perf_counter()
    r = requests.post(OLLAMA, json={
        "model": model,
        "prompt": f"请用 800 字左右详细讲解高中物理圆周运动中第 {idx} 个教学板块：1) 核心定义 2) 教学分析 3) 易错点拨 4) 提分技巧 5) 经典例题。要求：内容专业、排版清晰、使用 Markdown 格式（## 标题、- 列表、**加粗**）。",
        "stream": False,
        "think": False,
        "options": {"num_predict": 1600, "num_ctx": 8192, "temperature": 0.7}
    }, timeout=300).json()
    return idx, time.perf_counter() - t_s, r.get("eval_count", 0), r.get("response", "")

def run_config(model, parallel, label):
    print(f"\n{'='*60}")
    print(f"配置: {model} | {parallel}路并行 | {label}")
    print(f"{'='*60}")
    release_all()
    t0 = time.perf_counter()
    results = []
    with ThreadPoolExecutor(max_workers=parallel) as ex:
        futs = [ex.submit(gen_one, model, i, label) for i in range(1, 6)]
        for f in as_completed(futs):
            results.append(f.result())
    total = time.perf_counter() - t0
    results.sort()
    total_tokens = sum(r[2] for r in results)
    total_chars = sum(len(r[3]) for r in results)
    max_dur = max(r[1] for r in results)
    print(f"  总耗时: {total:.1f}s | 最长段: {max_dur:.1f}s")
    print(f"  总 tokens: {total_tokens} | 总字数: {total_chars}")
    print(f"  加速比（vs 串行 {5*max_dur:.1f}s）: {5*max_dur/total:.2f}x")
    print(f"  并发总吞吐: {total_tokens/total:.1f} tokens/s")
    for idx, dur, tokens, content in results:
        print(f"    段{idx}: {dur:.1f}s, {tokens} tok, {len(content)}字")
    return {"label": label, "model": model, "parallel": parallel, "total_s": total, "max_dur": max_dur, "total_tokens": total_tokens, "total_chars": total_chars}

# 配置矩阵
configs = [
    ("qwen3.5:2b", 5, "2b-5way"),
    ("qwen3.5:2b", 2, "2b-2way"),
    ("qwen3.5:4b", 1, "4b-1way"),
    ("qwen3.5:4b", 2, "4b-2way"),
    ("qwen3.5:9b", 1, "9b-1way"),
]

results_all = []
for m, p, l in configs:
    res = run_config(m, p, l)
    results_all.append(res)

print(f"\n\n{'#'*70}")
print(f"对比汇总")
print(f"{'#'*70}")
print(f"{'配置':<12} {'总耗时':<10} {'最长段':<10} {'总tokens':<10} {'总字数':<10} {'加速比':<10} {'t/s吞吐':<10}")
print("-" * 70)
for r in results_all:
    speedup = 5 * r["max_dur"] / r["total_s"]
    throughput = r["total_tokens"] / r["total_s"]
    print(f"{r['label']:<12} {r['total_s']:<10.1f} {r['max_dur']:<10.1f} {r['total_tokens']:<10} {r['total_chars']:<10} {speedup:<10.2f} {throughput:<10.1f}")

# 释放
release_all()
