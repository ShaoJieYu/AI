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

from common.llm import qwen_plus
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


def repair_common_json_errors(raw: str) -> str:
    """
    修复常见的 JSON 格式错误（第 4 层第 1 级）。

    修复项：
    - 去掉 markdown 代码块标记（```json ... ```）
    - 去掉前缀文字（如"好的，这是结果："）
    - 修复尾随逗号
    - 单引号转双引号
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

    response = qwen_plus.chat(
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


def teaching_design_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    教学设计 Agent 节点函数（供 LangGraph 调用）。

    打回重做时自动递增 retry_count（通过检查 qa_result 判断是否是重做）。

    参数：
        state: 当前 LessonPlanState

    返回：
        State 更新字典，包含 teaching_design 和 agent_trace 增量
    """
    user_request = state.get("user_request", "")
    student_profile = state.get("student_profile", {})
    token = state.get("token")
    qa_result = state.get("qa_result")
    retry_count = state.get("retry_count", 0)

    # 判断是否是打回重做（structure 问题打回到教学设计）
    is_retry = qa_result is not None and not qa_result.get("overall_pass", True)
    if is_retry:
        retry_count += 1
        print(f"[教学设计 Agent] 检测到打回重做，retry_count={retry_count}")

    # 构造上下文（学生信息）
    context = ""
    if student_profile:
        context = f"学生信息：{json.dumps(student_profile, ensure_ascii=False)}"

    # ReAct 循环
    react = ReActLoop(
        system_prompt=TEACHING_DESIGN_PROMPT,
        tools=TEACHING_DESIGN_TOOLS,
        max_iterations=5,
        token=token,
    )

    result = react.run(user_request, context=context)

    if not result["success"]:
        # ReAct 循环失败，用模板兜底
        print(f"[教学设计 Agent] ReAct 失败: {result['error']}")
        return {
            "teaching_design": TEMPLATE_TEACHING_DESIGN,
            "retry_count": retry_count,
            "current_node": "teaching_design",
            "agent_trace": state.get("agent_trace", []) + [{
                "agent": "teaching_design",
                "node": "teaching_design",
                "input_summary": user_request[:100],
                "output_summary": "ReAct 失败，使用模板兜底",
                "react_trace": result["trace"],
                "duration_ms": 0,
                "timestamp": "",
                "template_used": True,
                "retry_attempt": retry_count,
            }],
        }

    # 四层保障：解析 + 校验 + 兜底
    parsed = parse_and_validate_teaching_design(result["answer"])

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
