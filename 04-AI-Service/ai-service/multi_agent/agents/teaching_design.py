"""
教学设计 Agent

职责：拆解教学目标，输出五段式教学方案骨架。
实现方式：ReAct（自主决策检索什么教材、关注哪些薄弱点）
工具：search_textbook + get_student_weak_points

四层保障：
1. System Prompt 强约束（prompts.py 的 TEACHING_DESIGN_PROMPT）
2. Few-shot 示例（prompts.py 中的正例 + 反例）
3. Pydantic Schema 校验（schema.py 的 TeachingDesign 模型）
4. 兜底修复（解析失败自动修复 + LLM 自我修复 + 模板兜底）
"""
import json
import re
from typing import Dict, Any, Optional
from pydantic import ValidationError

from common.llm import llm, get_agent_llm
from config import TEST_MODE
from multi_agent.react_loop import ReActLoop
from multi_agent.prompts import TEACHING_DESIGN_PROMPT
from multi_agent.schema import TeachingDesign
from multi_agent.tools import TEACHING_DESIGN_TOOLS


# 模板兜底（第 4 层最后手段，保证流程不中断）
TEMPLATE_TEACHING_DESIGN = {
    "topic": "通用课程",
    "subject": "物理",
    "difficulty": "中等",
    "duration": 45,
    "objectives": ["掌握核心概念", "能够解决基础问题"],
    "key_points": ["核心定义", "基本公式"],
    "structure": [
        {"section": "导入", "method": "情境引入", "duration_min": 5},
        {"section": "新知讲解", "method": "讲授+演示", "duration_min": 15},
        {"section": "例题精讲", "method": "示范", "duration_min": 10},
        {"section": "练习巩固", "method": "学生练习", "duration_min": 10},
        {"section": "总结提升", "method": "归纳", "duration_min": 5},
    ],
}


LATEX_COMMANDS_WITH_JSON_ESCAPE_CHAR = {
    # b
    'beta', 'begin', 'bar', 'bold', 'boldsymbol', 'bmod', 'bullet', 'backslash', 
    'bigcap', 'bigcup', 'biguplus', 'bigwedge', 'bigvee', 'bigoplus', 'otimes',
    # f
    'frac', 'forall', 'flat', 'frown',
    # n
    'nu', 'neq', 'node', 'new', 'nabla', 'neg', 'noindent', 'not', 'notin', 
    'nearrow', 'nwarrow', 'newline',
    # r
    'rho', 'right', 'rangle', 'ref', 'real', 'rm', 'root', 'rightarrow', 'Rightarrow',
    # t
    'theta', 'tan', 'times', 'text', 'tau', 'tilde', 'top', 'to', 'triangle', 
    'texttt', 'textbf', 'textit', 'tfrac', 'tr',
    # u
    'upsilon', 'under', 'up', 'uparrow', 'Uparrow', 'underline', 'underbrace'
}


def escape_latex_backslash(raw: str) -> str:
    r"""
    修复 JSON 字符串值里的 LaTeX 反斜杠未转义问题。
    """
    def replacer(m):
        letters = m.group(1)
        # 如果首字母是 JSON 转义字符之一
        if letters[0] in 'bfnrtu':
            if len(letters) == 1:
                return '\\' + letters  # 单字母保留原样，如 \n, \t
            if letters in LATEX_COMMANDS_WITH_JSON_ESCAPE_CHAR:
                return '\\\\' + letters  # 确认是 LaTeX 命令，转义
            # 否则，视为 JSON 转义符后跟普通文本，只保留 \ 字符和后续文本
            return '\\' + letters[0] + letters[1:]
        
        # 非 JSON 转义字符开头，直接转义
        return '\\\\' + letters

    # (?<!\\) 负向后行断言：前面不是 \，避免重复转义
    return re.sub(r'(?<!\\)\\([a-zA-Z]+)', replacer, raw)


def repair_common_json_errors(raw: str) -> str:
    """
    修复常见的 JSON 格式错误（第 4 层第 1 级）。

    修复项：
    - 去掉 markdown 代码块标记（```json ... ```）
    - 去掉前缀文字（如"好的，这是结果："）
    - 修复尾随逗号
    - 单引号转双引号
    - 修复 LaTeX 反斜杠未转义问题
    - 修复对象中属性之间缺失的逗号
    """
    # 去掉 markdown 代码块标记
    if "```json" in raw:
        match = re.search(r"```json\s*(.*?)\s*```", raw, re.DOTALL)
        if match:
            raw = match.group(1)
    elif "```" in raw:
        match = re.search(r"```\s*(.*?)\s*```", raw, re.DOTALL)
        if match:
            raw = match.group(1)

    # 去掉前缀文字（找到第一个 { 开始的位置）
    first_brace = raw.find("{")
    if first_brace > 0:
        raw = raw[first_brace:]

    # 去掉后缀文字（保留到最后一个 }）
    last_brace = raw.rfind("}")
    if last_brace > 0 and last_brace < len(raw) - 1:
        raw = raw[:last_brace + 1]

    # 修复尾随逗号
    raw = re.sub(r",\s*}", "}", raw)
    raw = re.sub(r",\s*]", "]", raw)

    # 修复属性键之间缺失的逗号
    # 1. 修复双引号字符串值后面缺少的逗号
    raw = re.sub(r'("(?:[^"\\]|\\.)*")\s*\n\s*("[a-zA-Z0-9_]+")\s*:', r'\1,\n\2:', raw)
    # 2. 修复数值、布尔值、null 后面缺少的逗号
    raw = re.sub(r'(\b\d+(?:\.\d+)?|\btrue|\bfalse|\bnull)\s*\n\s*("[a-zA-Z0-9_]+")\s*:', r'\1,\n\2:', raw)
    # 3. 修复右括号/右花括号（数组/子对象）后面缺少的逗号
    raw = re.sub(r'([\]}])\s*\n\s*("[a-zA-Z0-9_]+")\s*:', r'\1,\n\2:', raw)

    # 修复 LaTeX 反斜杠未转义问题
    raw = escape_latex_backslash(raw)

    return raw


def llm_self_repair(raw_output: str, error: str) -> Optional[Dict]:
    """
    LLM 自我修复（第 4 层第 2 级）。

    把 ValidationError 的详细信息回喂给 LLM，让它自己修正。
    """
    repair_prompt = f"""你之前的输出有误，请修正。

【原始输出】
{raw_output[:2000]}

【错误信息】
{error}

【正确格式要求】
输出严格 JSON，结构如下：
{{
  "topic": "课程主题",
  "subject": "物理|化学|生物|数学|英语|语文|历史|地理|政治",
  "difficulty": "简单|中等|困难",
  "duration": 45,
  "objectives": ["教学目标1", "教学目标2"],
  "key_points": ["重点1", "重点2"],
  "structure": [
    {{"section": "导入", "method": "情境引入", "duration_min": 5}},
    {{"section": "新知讲解", "method": "讲授+演示", "duration_min": 15}},
    {{"section": "例题精讲", "method": "示范", "duration_min": 10}},
    {{"section": "练习巩固", "method": "学生练习", "duration_min": 10}},
    {{"section": "总结提升", "method": "归纳", "duration_min": 5}}
  ]
}}

关键约束：
- structure 必须有且仅有 5 个段落
- duration 是数字
- subject 用中文（物理/英语/数学 等，与 search_textbook 工具参数一致）
- difficulty 从 简单/中等/困难 中选一个

请直接输出修正后的 JSON，不要加任何解释。"""

    response = llm.chat(
        messages=[{"role": "user", "content": repair_prompt}],
        response_format={"type": "json_object"},
        max_tokens=2048,
        temperature=0.3,  # 降低温度提高稳定性
    )

    if not response["success"]:
        return None

    try:
        repaired_raw = repair_common_json_errors(response["content"])
        return json.loads(repaired_raw)
    except Exception:
        return None


def parse_and_validate_teaching_design(raw_output: str) -> Dict[str, Any]:
    """
    四层保障：解析 + 校验 + 兜底修复。

    返回：
        {
            "success": True/False,
            "data": TeachingDesign 转的 dict（成功时）,
            "template_used": True/False（是否用了模板兜底）,
            "error": "失败时的错误信息"
        }
    """
    # 第 4 层第 1 级：修复常见 JSON 错误
    try:
        repaired = repair_common_json_errors(raw_output)
        data = json.loads(repaired)
        design = TeachingDesign(**data)
        return {
            "success": True,
            "data": design.model_dump(),
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
            design = TeachingDesign(**repaired_data)
            return {
                "success": True,
                "data": design.model_dump(),
                "template_used": False,
                "error": None,
            }
        except ValidationError as e:
            json_error = f"LLM 修复后仍校验失败: {str(e)[:500]}"
        except Exception as e:
            json_error = f"LLM 修复后解析异常: {str(e)}"

    # 第 4 层第 3 级：模板兜底
    print(f"[教学设计 Agent] 兜底修复失败，使用模板: {json_error}")
    return {
        "success": True,
        "data": TEMPLATE_TEACHING_DESIGN,
        "template_used": True,
        "error": json_error,
    }


def _quick_generate_teaching_design(user_request: str, token: str = None) -> Dict[str, Any]:
    """
    TEST_MODE 快速生成教学设计（跳过 ReAct，直接 LLM 调用一次）。

    不调 search_textbook、不走 ReAct 循环，只是生成一个可用的 JSON 骨架。
    测试完成后自动 fallback 到正式模式。
    """
    import time as _time
    _t0 = _time.perf_counter()

    subject = "物理"
    for s in ["物理", "化学", "生物", "数学", "英语", "语文", "历史", "地理", "政治"]:
        if s in user_request:
            subject = s
            break

    topic = user_request
    for prefix in ["帮我准备一节", "准备一节", "主题是", "主题:", "主题："]:
        topic = topic.replace(prefix, "")
    topic = topic.replace(subject, "").strip("，,、 ")
    if len(topic) > 50:
        topic = topic[:50]

    prompt = f"""你是一名资深教学设计专家。根据用户需求，快速设计一节课的教学方案。

【用户需求】
{user_request}

【输出要求】
输出严格的 JSON，结构如下：
{{
  "topic": "课程主题",
  "subject": "{subject}",
  "difficulty": "中等",
  "duration": 45,
  "objectives": ["教学目标1", "教学目标2"],
  "key_points": ["重点1", "重点2"],
  "structure": [
    {{"section": "导入", "method": "情境引入", "duration_min": 5}},
    {{"section": "新知讲解", "method": "讲授+演示", "duration_min": 15}},
    {{"section": "例题精讲", "method": "示范", "duration_min": 10}},
    {{"section": "练习巩固", "method": "学生练习", "duration_min": 10}},
    {{"section": "总结提升", "method": "归纳", "duration_min": 5}}
  ]
}}

【关键约束】
- structure 数组必须有且仅有 5 个段落
- duration 是数字（整数）
- subject 必须用中文
- duration_min 是数字（整数）
- 直接输出 JSON，不要加任何解释或 markdown 代码块标记"""

    response = llm.chat(
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=2048,
        temperature=0.3,
    )

    elapsed = _time.perf_counter() - _t0
    if not response["success"]:
        print(f"[教学设计 Agent] 快速生成失败: {response['error']}（耗时 {elapsed:.1f}s）", flush=True)
        return {"success": False, "answer": "", "error": response["error"]}

    print(f"[教学设计 Agent] 快速生成完成（耗时 {elapsed:.1f}s）", flush=True)
    return {"success": True, "answer": response["content"]}


def teaching_design_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    教学设计 Agent 节点函数（供 LangGraph 调用）。

    受限 ReAct 5 轮 + 强制收敛 + 兜底方案：
    - 第 1-3 轮：LLM 自由决策调工具（最多 3 次工具调用）
    - 第 4 轮：tool_choice="none" 强制出 final answer
    - 第 5 轮：兜底，fallback 到固定流程
    - max_iterations=5 严格限制
    """
    import time as _time
    from multi_agent.tools import execute_multi_agent_tool, extract_unit_from_text
    _t0 = _time.perf_counter()

    user_request = state.get("user_request", "")
    student_profile = state.get("student_profile", {})
    token = state.get("token")
    qa_result = state.get("qa_result")
    retry_count = state.get("retry_count", 0)

    # 判断是否是打回重做
    is_retry = qa_result is not None and not qa_result.get("overall_pass", True)
    if is_retry:
        retry_count += 1
        print(f"[教学设计 Agent] 检测到打回重做，retry_count={retry_count}", flush=True)

    # ============================================================
    # 方案 0：TEST_MODE 快速通道（跳过 ReAct，直接 LLM 调用一次）
    # ============================================================
    if TEST_MODE:
        print(f"[教学设计 Agent] TEST_MODE 快速通道（跳过 ReAct，直接生成）", flush=True)
        quick_result = _quick_generate_teaching_design(user_request, token)
        if quick_result["success"]:
            parsed = parse_and_validate_teaching_design(quick_result["answer"])
            if not parsed["template_used"]:
                print(f"[计时] teaching_design（快速）总耗时: {_time.perf_counter() - _t0:.2f}s", flush=True)
                return {
                    "teaching_design": parsed["data"],
                    "retry_count": retry_count,
                    "current_node": "teaching_design",
                    "agent_trace": state.get("agent_trace", []) + [{
                        "agent": "teaching_design",
                        "node": "teaching_design",
                        "input_summary": user_request[:100],
                        "output_summary": f"主题: {parsed['data'].get('topic', '')}（TEST_MODE 快速）",
                        "react_trace": [],
                        "duration_ms": 0,
                        "timestamp": "",
                        "template_used": False,
                        "retry_attempt": retry_count,
                    }],
                }
        print(f"[教学设计 Agent] TEST_MODE 快速通道失败，走 ReAct 兜底", flush=True)

    # ============================================================
    # 方案 A：受限 ReAct（max_iterations=3 + 第 2 轮强制出答案）
    # ============================================================
    print(f"[教学设计 Agent] 启动受限 ReAct（max_iterations=5，强制收敛）", flush=True)
    react = ReActLoop(
        system_prompt=TEACHING_DESIGN_PROMPT,
        tools=TEACHING_DESIGN_TOOLS,
        max_iterations=5,  # 前 3 轮可调工具，第 4 轮强制出答案，第 5 轮兜底
        token=token,
        force_json_output=True,
        llm=get_agent_llm("teaching_design"),  # 强制 9b（ReAct 决策需要大模型）
    )

    result = react.run(user_request)
    print(f"[计时] 受限 ReAct 耗时: {_time.perf_counter() - _t0:.2f}s, 成功: {result['success']}", flush=True)

    if result["success"]:
        parsed = parse_and_validate_teaching_design(result["answer"])
        print(f"[计时] teaching_design 总耗时: {_time.perf_counter() - _t0:.2f}s", flush=True)
        return {
            "teaching_design": parsed["data"],
            "retry_count": retry_count,
            "current_node": "teaching_design",
            "agent_trace": state.get("agent_trace", []) + [{
                "agent": "teaching_design",
                "node": "teaching_design",
                "input_summary": user_request[:100],
                "output_summary": f"主题: {parsed['data'].get('topic', '')}, 模板兜底: {parsed['template_used']}",
                "react_trace": result["trace"],
                "duration_ms": 0,
                "timestamp": "",
                "template_used": parsed["template_used"],
                "retry_attempt": retry_count,
            }],
        }

    # ============================================================
    # 方案 B：Fallback 固定流程
    # ============================================================
    print(f"[教学设计 Agent] ReAct 失败，fallback 到固定流程: {result['error']}", flush=True)

    unit_hint = extract_unit_from_text(user_request or "")
    subject = "物理"
    for s in ["物理", "化学", "生物", "数学", "英语", "语文", "历史", "地理", "政治"]:
        if s in user_request:
            subject = s
            break

    topic = user_request
    for prefix in ["帮我准备一节", "准备一节", "主题是", "主题:", "主题："]:
        topic = topic.replace(prefix, "")
    topic = topic.replace(subject, "").strip("，,、 ")
    if len(topic) > 50:
        topic = topic[:50]

    keyword = f"{topic} {subject}"
    if unit_hint:
        keyword = f"Unit {unit_hint} {keyword}"

    _t_search_start = _time.perf_counter()
    try:
        textbook_content = execute_multi_agent_tool(
            "search_textbook",
            {"keyword": keyword, "subject": subject, "unit": unit_hint} if unit_hint else {"keyword": keyword, "subject": subject},
            token=token,
            unit_hint=unit_hint,
        )
        print(f"[计时] fallback search_textbook 检索耗时: {_time.perf_counter() - _t_search_start:.2f}s", flush=True)
    except Exception as e:
        print(f"[教学设计 Agent] fallback search_textbook 异常: {e}", flush=True)
        textbook_content = ""

    prompt = f"""你是一名资深教学设计专家。根据用户需求和教材内容，设计一节课的教学方案。

【用户需求】
{user_request}

【教材内容参考】
{textbook_content[:2000] if textbook_content else "（无教材检索结果，凭教学经验设计）"}

【学生信息】
{json.dumps(student_profile, ensure_ascii=False) if student_profile else "（无学生信息）"}

【输出要求】
输出严格的 JSON，结构如下：
{{
  "topic": "课程主题",
  "subject": "{subject}",
  "unit": {unit_hint if unit_hint else "null"},
  "difficulty": "简单|中等|困难",
  "duration": 45,
  "objectives": ["教学目标1", "教学目标2"],
  "key_points": ["重点1", "重点2"],
  "structure": [
    {{"section": "导入", "method": "情境引入", "duration_min": 5}},
    {{"section": "新知讲解", "method": "讲授+演示", "duration_min": 15}},
    {{"section": "例题精讲", "method": "示范", "duration_min": 10}},
    {{"section": "练习巩固", "method": "学生练习", "duration_min": 10}},
    {{"section": "总结提升", "method": "归纳", "duration_min": 5}}
  ]
}}

【关键约束】
- structure 数组必须有且仅有 5 个段落
- duration 是数字（整数）
- subject 必须用中文
- 直接输出 JSON，不要加任何解释或 markdown 代码块标记"""

    response = llm.chat(
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=2048,
        temperature=0.3,
    )

    if not response["success"]:
        print(f"[教学设计 Agent] fallback LLM 调用失败，使用模板兜底", flush=True)
        return {
            "teaching_design": TEMPLATE_TEACHING_DESIGN,
            "retry_count": retry_count,
            "current_node": "teaching_design",
            "agent_trace": state.get("agent_trace", []) + [{
                "agent": "teaching_design",
                "node": "teaching_design",
                "input_summary": user_request[:100],
                "output_summary": "ReAct + Fallback 均失败，使用模板兜底",
                "react_trace": result["trace"] + [{"step": 3, "type": "error", "content": response["error"]}],
                "duration_ms": 0,
                "timestamp": "",
                "template_used": True,
                "retry_attempt": retry_count,
            }],
        }

    parsed = parse_and_validate_teaching_design(response["content"])
    print(f"[计时] teaching_design（含 fallback）总耗时: {_time.perf_counter() - _t0:.2f}s", flush=True)

    return {
        "teaching_design": parsed["data"],
        "retry_count": retry_count,
        "current_node": "teaching_design",
        "agent_trace": state.get("agent_trace", []) + [{
            "agent": "teaching_design",
            "node": "teaching_design",
            "input_summary": user_request[:100],
            "output_summary": f"主题: {parsed['data'].get('topic', '')}, 模板兜底: {parsed['template_used']}（fallback）",
            "react_trace": result["trace"] + [{"step": 3, "type": "final_answer", "content": f"教学设计完成（fallback），主题: {parsed['data'].get('topic', '')}"}],
            "duration_ms": 0,
            "timestamp": "",
            "template_used": parsed["template_used"],
            "retry_attempt": retry_count,
        }],
    }
