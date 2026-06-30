"""
匹配项目实际参数：num_predict=16384（OllamaLLM.chat 强制下限）
对比 2b-5way / 2b-2way / 4b-2way
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

# 项目真实 prompt 长度：SECTION_GENERATION_PROMPT + 教学设计 JSON + 教材检索结果
# 模拟长 prompt
PROMPT = """你是高中物理教师，请为「圆周运动」课程生成「教材核心原文」段落（800字）。

【教学设计】
{"topic": "圆周运动", "subject": "物理", "difficulty": "中等", "duration": 45, "objectives": ["掌握圆周运动定义", "理解线速度/角速度/周期/频率", "能计算向心加速度"], "key_points": ["圆周运动定义", "线速度公式 v=2πr/T", "角速度公式 ω=2π/T", "向心加速度 a=ω²r=v²/r"], "structure": [{"section": "导入", "method": "情境引入", "duration_min": 5}, {"section": "新知讲解", "method": "讲授+演示", "duration_min": 15}, {"section": "例题精讲", "method": "示范", "duration_min": 10}, {"section": "练习巩固", "method": "学生练习", "duration_min": 10}, {"section": "总结提升", "method": "归纳", "duration_min": 5}]}

【教材检索结果】
第六章 圆周运动
6.1 圆周运动
6.2 匀速圆周运动的描述
6.3 向心加速度
6.4 向心力
...

【要求】
- 至少 800 字
- 包含教材核心定义、公式、推导
- 用 Markdown 排版（## 标题、- 列表、**加粗**）
- 引用教材原文用 > 引用块
"""

def gen_one(model, idx):
    t_s = time.perf_counter()
    r = requests.post(OLLAMA, json={
        "model": model,
        "prompt": f"【第{idx}段】" + PROMPT,
        "stream": False,
        "think": False,
        "options": {"num_predict": 16384, "num_ctx": 8192, "temperature": 0.7}
    }, timeout=600).json()
    return idx, time.perf_counter() - t_s, r.get("eval_count", 0), r.get("response", "")

def run_config(model, parallel, label):
    print(f"\n{'='*60}")
    print(f"配置: {model} | {parallel}路 | {label} (num_predict=16384)")
    print(f"{'='*60}")
    release_all()
    t0 = time.perf_counter()
    results = []
    with ThreadPoolExecutor(max_workers=parallel) as ex:
        futs = [ex.submit(gen_one, model, i) for i in range(1, 6)]
        for f in as_completed(futs):
            results.append(f.result())
    total = time.perf_counter() - t0
    results.sort()
    total_tokens = sum(r[2] for r in results)
    total_chars = sum(len(r[3]) for r in results)
    max_dur = max(r[1] for r in results)
    min_dur = min(r[1] for r in results)
    print(f"  总耗时: {total:.1f}s | 最长: {max_dur:.1f}s | 最短: {min_dur:.1f}s | 不均匀度: {max_dur/min_dur:.2f}x")
    print(f"  总 tokens: {total_tokens} | 总字数: {total_chars}")
    print(f"  加速比: {5*max_dur/total:.2f}x | 吞吐: {total_tokens/total:.1f} t/s")
    for idx, dur, tokens, content in results:
        print(f"    段{idx}: {dur:.1f}s, {tokens} tok, {len(content)}字")
    return {"label": label, "total_s": total, "max_dur": max_dur, "min_dur": min_dur, "total_chars": total_chars}

configs = [
    ("qwen3.5:2b", 5, "2b-5way-real"),
    ("qwen3.5:2b", 2, "2b-2way-real"),
    ("qwen3.5:4b", 2, "4b-2way-real"),
]

results_all = []
for m, p, l in configs:
    res = run_config(m, p, l)
    results_all.append(res)

print(f"\n\n{'#'*70}")
print(f"真实场景对比汇总（num_predict=16384，模拟长 prompt）")
print(f"{'#'*70}")
print(f"{'配置':<18} {'总耗时':<10} {'最长段':<10} {'最短段':<10} {'不均匀':<10} {'总字数':<10}")
print("-" * 70)
for r in results_all:
    print(f"{r['label']:<18} {r['total_s']:<10.1f} {r['max_dur']:<10.1f} {r['min_dur']:<10.1f} {r['max_dur']/r['min_dur']:<10.2f} {r['total_chars']:<10}")

release_all()
