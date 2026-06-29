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
from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from pydantic import ValidationError

from common.llm import qwen_plus
from multi_agent.react_loop import ReActLoop
from multi_agent.prompts import CONTENT_GENERATION_PROMPT
from multi_agent.schema import ContentDraft
from multi_agent.tools import CONTENT_GENERATION_TOOLS
from multi_agent.agents.teaching_design import repair_common_json_errors, llm_self_repair


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

    # 第 4 层第 2 级：LLM 自我修复
    repaired_data = llm_self_repair(raw_output, json_error)
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

    response = qwen_plus.chat(
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

    打回重做时自动递增 retry_count（通过检查 qa_result 判断是否是重做）。
    """
    teaching_design = state.get("teaching_design", {})
    user_request = state.get("user_request", "")
    qa_result = state.get("qa_result")  # 重做场景下有值
    retry_count = state.get("retry_count", 0)
    token = state.get("token")

    # 判断是否是打回重做：有 qa_result 且未通过，说明是质检打回
    is_retry = qa_result is not None and not qa_result.get("overall_pass", True)
    if is_retry:
        retry_count += 1
        print(f"[内容生成 Agent] 检测到打回重做，retry_count={retry_count}")

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

    # 构造上下文
    context = f"教学设计：{json.dumps(teaching_design, ensure_ascii=False)}"

    # ReAct 循环
    prompt = CONTENT_GENERATION_PROMPT.format(
        teaching_design=json.dumps(teaching_design, ensure_ascii=False),
        retry_feedback=retry_feedback,
    )

    react = ReActLoop(
        system_prompt=prompt,
        tools=CONTENT_GENERATION_TOOLS,
        max_iterations=5,  # 内容生成需要足够轮次：3 次检索用掉了所有轮次会导致模板兜底
        token=token,
    )

    result = react.run(user_request, context=context)

    if not result["success"]:
        print(f"[内容生成 Agent] ReAct 失败: {result['error']}")
        return {
            "content_draft": TEMPLATE_CONTENT_DRAFT,
            "retry_count": retry_count,
            "current_node": "content_generation",
            "agent_trace": state.get("agent_trace", []) + [{
                "agent": "content_generation",
                "node": "content_generation",
                "input_summary": f"主题: {teaching_design.get('topic', '')}",
                "output_summary": "ReAct 失败，使用模板兜底",
                "react_trace": result["trace"],
                "duration_ms": 0,
                "timestamp": "",
                "template_used": True,
                "retry_attempt": retry_count,
            }],
        }

    # 四层保障：解析 + 校验
    parsed = parse_and_validate_content_draft(result["answer"])

    # 后处理：给无 Markdown 排版的段落补加排版（双保险，确保输出可读）
    if not parsed["template_used"]:
        parsed["data"] = format_content_with_markdown(parsed["data"])

    return {
        "content_draft": parsed["data"],
        "retry_count": retry_count,
        "current_node": "content_generation",
        "agent_trace": state.get("agent_trace", []) + [{
            "agent": "content_generation",
            "node": "content_generation",
            "input_summary": f"主题: {teaching_design.get('topic', '')}, 重做: {retry_count}",
            "output_summary": f"五段式内容生成{'（模板兜底）' if parsed['template_used'] else '（含 Markdown 排版后处理）'}",
            "react_trace": result["trace"],
            "duration_ms": 0,
            "timestamp": "",
            "template_used": parsed["template_used"],
            "retry_attempt": retry_count,
        }],
    }
