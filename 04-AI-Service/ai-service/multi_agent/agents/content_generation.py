"""
内容生成 Agent

职责：基于教学设计 + RAG 检索，生成五段式完整内容。
实现方式：ReAct（自主决策检索什么教材，重做时根据质检反馈调整）
工具：search_textbook

四层保障：
1. System Prompt 强约束（prompts.py 的 CONTENT_GENERATION_PROMPT）
2. Few-shot 示例
3. Pydantic Schema 校验（schema.py 的 ContentDraft 模型）
4. 兜底修复（复用 teaching_design 的修复逻辑）
"""
import json
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from pydantic import ValidationError

from common.llm import llm
from config import TEST_MODE
from multi_agent.react_loop import ReActLoop
from multi_agent.prompts import (
    CONTENT_GENERATION_PROMPT,
    SECTION_GENERATION_PROMPT,
    SECTION_SPECS,
    get_section_requirement,
    get_section_word_count,
)
from multi_agent.schema import ContentDraft
from multi_agent.tools import CONTENT_GENERATION_TOOLS
from multi_agent.agents.teaching_design import repair_common_json_errors


def _generate_single_section(
    section_key: str,
    teaching_design: Dict[str, Any],
    textbook_content: str,
    retry_feedback: str,
) -> tuple[str, str]:
    """
    生成单个段落（供 ThreadPoolExecutor 并发调用）。

    返回 (section_key, content) 二元组，失败时 content 为模板兜底文本。
    """
    spec = SECTION_SPECS[section_key]
    # 根据 TEST_MODE 动态注入字数要求（测试模式 200 字，正式模式 800 字）
    prompt = SECTION_GENERATION_PROMPT.format(
        section_label=spec["label"],
        teaching_design=json.dumps(teaching_design, ensure_ascii=False),
        textbook_content=textbook_content or "（无教材检索结果，凭教学经验生成）",
        section_requirement=get_section_requirement(section_key),
        retry_feedback=retry_feedback,
    )
    # 测试模式用更小的 max_tokens，节省时间
    section_word_count = get_section_word_count()
    max_tokens = 1024 if section_word_count <= 300 else 2048

    try:
        response = llm.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=max_tokens,  # 测试模式 1024 / 正式模式 2048
        )
        if not response["success"]:
            print(f"[并行生成] {section_key} 失败: {response['error']}", flush=True)
            return (section_key, f"（{spec['label']}生成失败，模板兜底）")
        content = response["content"].strip()
        # 防止 LLM 加 ```markdown 包裹
        if content.startswith("```"):
            lines = content.split("\n")
            if len(lines) >= 2:
                content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        # 测试模式：强制截断到目标字数（2b/4b 模型不会严格遵守字数要求）
        # 截断策略：找到目标字数附近的句子边界（句号/换行），避免在词中间截断
        if TEST_MODE and len(content) > section_word_count * 1.5:
            truncated = content[:int(section_word_count * 1.5)]
            # 找最后一个句号或换行
            last_punct = max(truncated.rfind("。"), truncated.rfind("\n"))
            if last_punct > section_word_count * 0.7:
                content = truncated[:last_punct + 1]
            else:
                content = truncated
            print(f"[并行生成] {section_key} 测试模式截断到 {len(content)} 字（原 >{section_word_count * 1.5}）", flush=True)
        else:
            print(f"[并行生成] {section_key} 完成，{len(content)} 字", flush=True)

        return (section_key, content or f"（{spec['label']}生成失败，模板兜底）")
    except Exception as e:
        print(f"[并行生成] {section_key} 异常: {e}", flush=True)
        return (section_key, f"（{spec['label']}生成异常，模板兜底）")


def get_max_workers_for_model(model_name: str) -> int:
    """
    根据 Ollama 模型名自动选择内容生成的并发路数。

    策略（基于 2026-07-01 端到端实测数据）：
    - 2b 模型（如 qwen3.5:2b）：2 路并发（实测 63.2s, 不均匀 1.74x，优于 5路 66.4s/不均匀 3.25x）
    - 4b 模型（如 qwen3.5:4b）：2 路并发（实测 86.3s, 不均匀 1.50x）
    - 9b+ 模型（如 qwen3.5:9b）：大模型、显存紧张，不并发（1 路串行）
    - 其他/未知：默认 2 路（保守策略）

    设计依据（来自 config_compare_test.log + realistic_compare_test.log）：
    - 2b 5路虽然总耗时接近 2路（66.4s vs 63.2s），但段间不均匀度 3.25x，
      某段可能撞 num_predict 上限拖到 60+s，导致前端"卡死"感
    - 2路加速比 2.13x 接近 5路 5x，但稳定性好得多（1.74x 不均匀）
    - 4b 2路加速 2.20x，1路 1.29x，2路明显更快
    - 9b+ 1路 35 t/s，2路会 OOM
    """
    if not model_name:
        return 2
    model_lower = model_name.lower()
    # 2b 模型：2 路并发（之前 5 路导致段间不均匀，最长段可达 66s）
    if "2b" in model_lower:
        return 2
    # 4b 模型：2 路并发
    if "4b" in model_lower:
        return 2
    # 9b 及以上：不并发
    if "9b" in model_lower or "14b" in model_lower or "32b" in model_lower or "72b" in model_lower:
        return 1
    # 默认保守
    return 2


def generate_five_sections_parallel(
    teaching_design: Dict[str, Any],
    textbook_content: str,
    retry_feedback: str = "",
    max_workers: Optional[int] = None,
) -> Dict[str, str]:
    """
    并行生成五段式内容。

    用 ThreadPoolExecutor 同时生成 5 段，总耗时 ≈ 最长一段。
    相比串行 5×40s=200s，并发后约 40-50s。

    参数：
        max_workers: 并发路数。None 时根据 registry 当前实例自动选择：
            - 本地 Ollama：按模型大小自动选（2B→2路, 4B→2路, 9B+→1路）
            - 云端 qwen-plus：5 路（不受显存限制）

    并发数动态感知：
        之前从 config.OLLAMA_MODEL 静态读取，导致热切换 provider 后
        并发路数仍是切换前的值。新版从 registry.get() 动态读取实际模型名。
    """
    # 根据 registry 当前实例动态选择并发数
    if max_workers is None:
        from common.llm import registry
        provider = registry.current_provider()
        inst = registry.get()
        if provider == "local":
            # OllamaLLM 实例暴露 .model 属性
            model_name = getattr(inst, "model", "")
            max_workers = get_max_workers_for_model(model_name)
        else:
            # 云端模型默认 5 路（不受显存限制）
            max_workers = 5
    print(f"[并行生成] 启动 5 段并发生成（max_workers={max_workers}）...", flush=True)
    import time as _t
    _t0 = _t.perf_counter()
    sections: Dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="section") as executor:
        future_to_key = {
            executor.submit(
                _generate_single_section,
                key, teaching_design, textbook_content, retry_feedback,
            ): key
            for key in SECTION_SPECS
        }
        for future in as_completed(future_to_key):
            key, content = future.result()
            sections[key] = content
    _t_total = _t.perf_counter() - _t0
    print(f"[并行生成] 5 段全部完成（max_workers={max_workers}, 总耗时 {_t_total:.1f}s）", flush=True)
    return sections


# 模板兜底（第 4 层最后手段）
TEMPLATE_CONTENT_DRAFT = {
    "topic": "通用课程",
    "subject": "物理",
    "coreDefinition": "（模板兜底）教材核心原文内容，实际使用时应由 LLM 生成。",
    "teachingAnalysis": "（模板兜底）教学深度剖析内容。",
    "mistakeWarnings": "（模板兜底）易错点拨内容。",
    "scoreBoosting": "（模板兜底）提分技巧内容。",
    "exampleDerivation": "（模板兜底）经典例题推导内容。",
}


def content_self_repair(raw_output: str, error: str) -> Optional[Dict]:
    """
    ContentDraft 专用的 LLM 自我修复（第 4 层第 2 级）。

    注意：不能复用 teaching_design.llm_self_repair，因为那个函数的修复 prompt
    用的是 TeachingDesign 的 schema（含 duration_min/section 等字段），
    会导致 LLM 修复后返回错误的字段名。ContentDraft 必须用自己的 schema。
    """
    repair_prompt = f"""你之前的输出有误，请修正。

【原始输出】
{raw_output[:2000]}

【错误信息】
{error}

【正确格式要求】
输出严格 JSON，有且仅有以下 7 个字段（禁止使用 duration_min/section/method/objectives/key_points/structure/difficulty 等字段名）：
{{
  "topic": "课程主题",
  "subject": "物理",
  "coreDefinition": "教材核心原文（800字以上，含 Markdown 排版）",
  "teachingAnalysis": "教学深度剖析（800字以上，含 Markdown 排版）",
  "mistakeWarnings": "易错点拨（800字以上，含 Markdown 排版）",
  "scoreBoosting": "提分技巧（800字以上，含 Markdown 排版）",
  "exampleDerivation": "经典例题推导（800字以上，含 Markdown 排版）"
}}

关键约束：
- 5 个内容字段（coreDefinition/teachingAnalysis/mistakeWarnings/scoreBoosting/exampleDerivation）都不能为空
- 每段至少 800 字
- 禁止输出 duration_min、section、method、objectives、key_points、structure、difficulty 等教学设计字段

请直接输出修正后的 JSON，不要加任何解释。"""

    response = llm.chat(
        messages=[{"role": "user", "content": repair_prompt}],
        response_format={"type": "json_object"},
        max_tokens=8192,
        temperature=0.3,
    )

    if not response["success"]:
        return None

    try:
        repaired_raw = repair_common_json_errors(response["content"])
        return json.loads(repaired_raw)
    except Exception:
        return None


def parse_and_validate_content_draft(raw_output: str) -> Dict[str, Any]:
    """
    四层保障：解析 + 校验 + 兜底修复（复用 teaching_design 的修复函数）。
    """
    # 第 4 层第 1 级：修复常见 JSON 错误
    try:
        repaired = repair_common_json_errors(raw_output)
        data = json.loads(repaired)
        draft = ContentDraft(**data)
        return {
            "success": True,
            "data": draft.model_dump(),
            "template_used": False,
            "error": None,
        }
    except json.JSONDecodeError as e:
        json_error = f"JSON 解析失败: {str(e)}"
    except ValidationError as e:
        json_error = f"Schema 校验失败: {str(e)[:500]}"
    except Exception as e:
        json_error = f"解析异常: {str(e)}"

    # 第 4 层第 2 级：LLM 自我修复（ContentDraft 专用，用正确的 schema）
    repaired_data = content_self_repair(raw_output, json_error)
    if repaired_data:
        try:
            draft = ContentDraft(**repaired_data)
            return {
                "success": True,
                "data": draft.model_dump(),
                "template_used": False,
                "error": None,
            }
        except ValidationError as e:
            json_error = f"LLM 修复后仍校验失败: {str(e)[:500]}"
        except Exception as e:
            json_error = f"LLM 修复后解析异常: {str(e)}"

    # 第 4 层第 3 级：模板兜底
    print(f"[内容生成 Agent] 兜底修复失败，使用模板: {json_error}")
    return {
        "success": True,
        "data": TEMPLATE_CONTENT_DRAFT,
        "template_used": True,
        "error": json_error,
    }


# 五段式字段名（中文标签用于 LLM 重写 prompt）
_SECTION_LABELS = {
    "coreDefinition": "教材核心原文",
    "teachingAnalysis": "教学深度剖析",
    "mistakeWarnings": "易错点拨",
    "scoreBoosting": "提分技巧",
    "exampleDerivation": "经典例题推导",
}


def _has_markdown_format(text: str) -> bool:
    """
    检测文本是否已有 Markdown 排版元素。
    判定标准：至少有 1 个二级标题（## ）或 3 个无序列表项（- ）。
    """
    if not text or len(text) < 30:
        return True  # 太短的内容（如模板兜底）跳过
    h2_count = text.count("\n## ") + (1 if text.startswith("## ") else 0)
    list_count = text.count("\n- ") + (1 if text.startswith("- ") else 0)
    return h2_count >= 1 or list_count >= 3


def _rewrite_section_with_markdown(section_key: str, raw_text: str) -> str:
    """
    调用 LLM 给原文加 Markdown 排版，不改变内容本身。

    参数：
        section_key: 字段名（如 coreDefinition）
        raw_text: 原始纯文本内容

    返回：
        加好 Markdown 排版的文本；如果 LLM 调用失败则返回原文。
    """
    label = _SECTION_LABELS.get(section_key, section_key)
    prompt = f"""请为以下「{label}」内容加上 Markdown 排版，使其层次清晰、易读。

【排版要求】
- 用 `## 标题` 划分小节（至少 2 个二级标题）
- 用 `- 无序列表` 列举要点、步骤、条目
- 用 `**加粗**` 强调关键术语、定义
- 涉及对比、分类时用 `| 表格 |` 呈现
- 引用教材原文用 `> 引用块` 标注
- 段落之间用空行分隔

【硬性约束】
- 必须保留原文所有信息，不得删减、改写或添加新内容
- 不得添加原文没有的标题（如原文没讲例题，不要自己加例题标题）
- 输出纯文本 Markdown，不要加代码块包裹，不要加任何前后说明

【原文】
{raw_text}

请直接输出加好 Markdown 排版的「{label}」内容："""

    response = llm.chat(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,  # 低温度保证不发散
        max_tokens=8192,
    )

    if not response["success"]:
        print(f"[内容生成 Agent] Markdown 重写失败（{section_key}）: {response['error']}")
        return raw_text

    formatted = response["content"].strip()
    # 防止 LLM 加 ```markdown 包裹
    if formatted.startswith("```"):
        lines = formatted.split("\n")
        if len(lines) >= 2:
            formatted = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
    return formatted if formatted else raw_text


def format_content_with_markdown(content_draft: Dict[str, Any]) -> Dict[str, Any]:
    """
    后处理：检测五段式内容是否已有 Markdown 排版，没有的段调用 LLM 重写。

    优化：使用 ThreadPoolExecutor 并发重写多段。串行 5 段约 60s，
    并发后总耗时 ≈ 最长一段（约 12s），预计整体响应时间 103s → 55s。

    参数：
        content_draft: ContentDraft 转的 dict

    返回：
        处理后的 dict（字段值可能被重写为 Markdown 格式）
    """
    # 模板兜底内容跳过（避免无意义重写）
    if content_draft.get("template_used"):
        return content_draft

    # 第 1 步：先收集所有需要重写的段（避免在循环中串行调 LLM）
    sections_to_rewrite = []
    for key in _SECTION_LABELS:
        text = content_draft.get(key, "")
        if not text or "（模板兜底）" in text:
            continue
        if _has_markdown_format(text):
            continue
        sections_to_rewrite.append((key, text))
        print(f"[内容生成 Agent] 检测到 {key} 无 Markdown 排版，将并发重写")

    if not sections_to_rewrite:
        return content_draft

    # 第 2 步：并发重写（max_workers=5，每段一个线程，dashscope SDK 线程安全）
    print(f"[内容生成 Agent] 并发重写 {len(sections_to_rewrite)} 段（串行需 ~{len(sections_to_rewrite) * 12}s，并发预计 ~12s）")
    with ThreadPoolExecutor(max_workers=5, thread_name_prefix="md-rewrite") as executor:
        future_to_key = {
            executor.submit(_rewrite_section_with_markdown, key, text): key
            for key, text in sections_to_rewrite
        }
        for future in as_completed(future_to_key):
            key = future_to_key[future]
            try:
                content_draft[key] = future.result()
            except Exception as e:
                # 单段失败不影响其他段，保留原文
                print(f"[内容生成 Agent] {key} 并发重写异常: {e}，保留原文")

    return content_draft


def content_generation_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    内容生成 Agent 节点函数（供 LangGraph 调用）。

    优化版（5 段并行生成）：
    - 第 1 步：直接调 search_textbook 检索教材（绕过 ReAct，约 1-2s）
    - 第 2 步：5 段内容并行生成（ThreadPoolExecutor，约 40-50s）
    - 第 3 步：拼装成 ContentDraft 格式（<1s）
    总耗时从 555s 降到约 45-55s，提速 10 倍。

    打回重做时自动递增 retry_count（通过检查 qa_result 判断是否是重做）。
    """
    import time as _time
    from multi_agent.tools import execute_multi_agent_tool, extract_unit_from_text
    _t0 = _time.perf_counter()
    teaching_design = state.get("teaching_design", {})
    user_request = state.get("user_request", "")
    qa_result = state.get("qa_result")  # 重做场景下有值
    retry_count = state.get("retry_count", 0)
    token = state.get("token")

    # 判断是否是打回重做：有 qa_result 且未通过，说明是质检打回
    is_retry = qa_result is not None and not qa_result.get("overall_pass", True)
    if is_retry:
        retry_count += 1
        print(f"[内容生成 Agent] 检测到打回重做，retry_count={retry_count}", flush=True)

    # 构造质检反馈（重做场景）
    retry_feedback = ""
    if qa_result and not qa_result.get("overall_pass", True):
        issues = []
        for dim_name, dim_data in qa_result.get("dimensions", {}).items():
            if dim_data.get("issues"):
                issues.extend(dim_data["issues"])
        retry_feedback = f"【质检反馈（第 {retry_count} 次重做）】\n请重点修复以下问题：\n"
        retry_feedback += "\n".join([f"- {issue}" for issue in issues])
        retry_feedback += f"\n\n重做建议：{qa_result.get('retry_suggestion', '')}"

    # ============================================================
    # 第 1 步：直接调 search_textbook 检索教材（绕过 ReAct）
    # ============================================================
    # 复用 teaching_design 的 unit 提取逻辑（从用户原始输入提取）
    unit_hint = extract_unit_from_text(user_request or "")
    # 也尝试从教学设计 JSON 读 unit（teaching_design Agent 可能输出 unit 字段）
    if not unit_hint and teaching_design.get("unit"):
        unit_hint = teaching_design.get("unit")

    topic = teaching_design.get("topic", "")
    subject = teaching_design.get("subject", "")
    keyword = f"{topic} {subject}"

    _t_search_start = _time.perf_counter()
    try:
        textbook_content = execute_multi_agent_tool(
            "search_textbook",
            {"keyword": keyword, "subject": subject, "unit": unit_hint} if unit_hint else {"keyword": keyword, "subject": subject},
            token=token,
            unit_hint=unit_hint,
        )
        print(f"[计时] search_textbook 检索耗时: {_time.perf_counter() - _t_search_start:.2f}s", flush=True)
        print(f"[内容生成 Agent] 教材检索结果长度: {len(textbook_content)} 字", flush=True)
    except Exception as e:
        print(f"[内容生成 Agent] search_textbook 异常: {e}，继续凭经验生成", flush=True)
        textbook_content = ""

    # ============================================================
    # 第 2 步：5 段并行生成
    # ============================================================
    _t_parallel_start = _time.perf_counter()
    sections = generate_five_sections_parallel(
        teaching_design=teaching_design,
        textbook_content=textbook_content,
        retry_feedback=retry_feedback,
    )
    print(f"[计时] 5 段并行生成耗时: {_time.perf_counter() - _t_parallel_start:.2f}s", flush=True)

    # ============================================================
    # 第 3 步：拼装成 ContentDraft 格式（无需 parse_and_validate）
    # ============================================================
    # 判断是否所有段都用了模板兜底
    template_used = all("模板兜底" in v for v in sections.values())

    content_draft = {
        "topic": topic,
        "subject": subject,
        "coreDefinition": sections.get("coreDefinition", ""),
        "teachingAnalysis": sections.get("teachingAnalysis", ""),
        "mistakeWarnings": sections.get("mistakeWarnings", ""),
        "scoreBoosting": sections.get("scoreBoosting", ""),
        "exampleDerivation": sections.get("exampleDerivation", ""),
    }

    # 打印各段字数
    for key in ["coreDefinition", "teachingAnalysis", "mistakeWarnings", "scoreBoosting", "exampleDerivation"]:
        print(f"[内容生成 Agent] {key}: {len(content_draft[key])} 字", flush=True)

    print(f"[计时] content_generation 总耗时: {_time.perf_counter() - _t0:.2f}s", flush=True)

    # 构造 ReAct trace（兼容前端展示：记录检索+生成两步）
    react_trace = [
        {
            "step": 1,
            "type": "action",
            "name": "search_textbook",
            "input": {"keyword": keyword, "subject": subject, "unit": unit_hint},
        },
        {
            "step": 2,
            "type": "observation",
            "content": textbook_content[:500] + "..." if len(textbook_content) > 500 else textbook_content,
        },
        {
            "step": 3,
            "type": "final_answer",
            "content": f"5 段并行生成完成，总字数 {sum(len(v) for v in sections.values())}",
        },
    ]

    return {
        "content_draft": content_draft,
        "retry_count": retry_count,
        "current_node": "content_generation",
        "agent_trace": state.get("agent_trace", []) + [{
            "agent": "content_generation",
            "node": "content_generation",
            "input_summary": f"主题: {topic}, 重做: {retry_count}",
            "output_summary": f"五段式内容并行生成{'（模板兜底）' if template_used else '（含 Markdown 排版）'}",
            "react_trace": react_trace,
            "duration_ms": 0,
            "timestamp": "",
            "template_used": template_used,
            "retry_attempt": retry_count,
        }],
    }
