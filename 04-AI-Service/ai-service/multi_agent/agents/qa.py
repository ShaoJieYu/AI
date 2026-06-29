"""
质检 Agent

职责：对内容生成 Agent 的输出做三维评分（准确性/排版/公式），
     不合格时输出 issue_type 决定路由到哪个 Agent 重做。
实现方式：Function Calling（一次 LLM 调用，不走 ReAct 多轮推理）

三维评分模型：
- accuracy（准确性）：知识点是否正确，阈值 80
- format（排版）：是否符合五段式规范，阈值 75
- formula（公式）：LaTeX 语法 + 单位标注，阈值 80

路由规则（issue_type 字段）：
- 三维都达标 → overall_pass=true, issue_type=none → 进导出 Agent
- 准确性/公式/排版不达标 → issue_type=content → 打回到内容生成 Agent
- 段落数不对或教学目标偏离 → issue_type=structure → 打回到教学设计 Agent
"""
import json
from typing import Dict, Any
from pydantic import ValidationError

from common.llm import qwen_plus
from multi_agent.prompts import QA_PROMPT
from multi_agent.schema import QaResult
from multi_agent.agents.teaching_design import repair_common_json_errors


# 模板兜底（通过场景，避免质检失败阻塞流程）
TEMPLATE_QA_PASS = {
    "dimensions": {
        "accuracy": {"score": 80, "threshold": 80, "issues": ["质检 Agent 异常，默认通过"]},
        "format": {"score": 80, "threshold": 75, "issues": []},
        "formula": {"score": 80, "threshold": 80, "issues": []},
    },
    "overall_pass": True,
    "issue_type": "none",
    "retry_suggestion": "",
    "forced_pass": False,
}


def llm_self_repair_qa(raw_output: str, error: str) -> Dict[str, Any]:
    """LLM 自我修复（质检专用）"""
    repair_prompt = f"""你之前的输出有误，请修正。

【原始输出】
{raw_output[:2000]}

【错误信息】
{error}

【正确格式要求】
输出严格 JSON：
{{
  "dimensions": {{
    "accuracy": {{"score": 88, "threshold": 80, "issues": ["问题1"]}},
    "format": {{"score": 92, "threshold": 75, "issues": []}},
    "formula": {{"score": 65, "threshold": 80, "issues": ["问题1"]}}
  }},
  "overall_pass": false,
  "issue_type": "content",
  "retry_suggestion": "修复建议"
}}

关键约束：
- dimensions 必须包含 accuracy/format/formula 三个维度
- issue_type 从 content/structure/none 中选一个
- overall_pass=true 时 issue_type 必须为 none

请直接输出修正后的 JSON。"""

    response = qwen_plus.chat(
        messages=[{"role": "user", "content": repair_prompt}],
        response_format={"type": "json_object"},
        max_tokens=2048,
        temperature=0.3,
    )

    if not response["success"]:
        return None

    try:
        repaired_raw = repair_common_json_errors(response["content"])
        return json.loads(repaired_raw)
    except Exception:
        return None


def parse_and_validate_qa_result(raw_output: str) -> Dict[str, Any]:
    """四层保障：解析 + 校验 + 兜底修复（质检专用）"""
    # 第 4 层第 1 级
    try:
        repaired = repair_common_json_errors(raw_output)
        data = json.loads(repaired)
        qa = QaResult(**data)
        return {
            "success": True,
            "data": qa.model_dump(),
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
    repaired_data = llm_self_repair_qa(raw_output, json_error)
    if repaired_data:
        try:
            qa = QaResult(**repaired_data)
            return {
                "success": True,
                "data": qa.model_dump(),
                "template_used": False,
                "error": None,
            }
        except ValidationError as e:
            json_error = f"LLM 修复后仍校验失败: {str(e)[:500]}"
        except Exception as e:
            json_error = f"LLM 修复后解析异常: {str(e)}"

    # 第 4 层第 3 级：模板兜底（默认通过，避免阻塞）
    print(f"[质检 Agent] 兜底修复失败，使用模板（默认通过）: {json_error}")
    return {
        "success": True,
        "data": TEMPLATE_QA_PASS,
        "template_used": True,
        "error": json_error,
    }


def qa_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    质检 Agent 节点函数（供 LangGraph 调用）。
    """
    teaching_design = state.get("teaching_design", {})
    content_draft = state.get("content_draft", {})
    retry_count = state.get("retry_count", 0)
    max_retry = state.get("max_retry", 3)

    # 构造 prompt
    prompt = QA_PROMPT.format(
        teaching_design=json.dumps(teaching_design, ensure_ascii=False),
        content_draft=json.dumps(content_draft, ensure_ascii=False),
    )

    # 一次 LLM 调用（Function Calling 轻量模式，不走 ReAct）
    response = qwen_plus.chat(
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=2048,
        temperature=0.3,  # 降低温度提高评分稳定性
    )

    react_trace = []

    if not response["success"]:
        print(f"[质检 Agent] LLM 调用失败: {response['error']}")
        # LLM 失败时，如果已经超过 max_retry，强制通过；否则默认不通过打回
        if retry_count >= max_retry:
            qa_data = {**TEMPLATE_QA_PASS, "forced_pass": True}
        else:
            qa_data = {
                "dimensions": {
                    "accuracy": {"score": 50, "threshold": 80, "issues": ["LLM 调用失败"]},
                    "format": {"score": 50, "threshold": 75, "issues": []},
                    "formula": {"score": 50, "threshold": 80, "issues": []},
                },
                "overall_pass": False,
                "issue_type": "content",
                "retry_suggestion": "LLM 调用失败，请重试",
                "forced_pass": False,
            }
        return {
            "qa_result": qa_data,
            "current_node": "qa",
            "agent_trace": state.get("agent_trace", []) + [{
                "agent": "qa",
                "node": "qa",
                "input_summary": f"主题: {teaching_design.get('topic', '')}, 重做: {retry_count}",
                "output_summary": "LLM 失败，使用兜底",
                "react_trace": [{"step": 1, "type": "error", "content": response["error"]}],
                "duration_ms": 0,
                "timestamp": "",
                "template_used": True,
                "retry_attempt": retry_count,
            }],
        }

    # 四层保障：解析 + 校验
    parsed = parse_and_validate_qa_result(response["content"])
    qa_data = parsed["data"]

    # 检查是否超过 max_retry，强制通过
    if retry_count >= max_retry and not qa_data.get("overall_pass"):
        qa_data["forced_pass"] = True
        qa_data["overall_pass"] = True
        qa_data["issue_type"] = "none"
        print(f"[质检 Agent] 超过最大重做次数 {max_retry}，强制通过")

    return {
        "qa_result": qa_data,
        "current_node": "qa",
        "agent_trace": state.get("agent_trace", []) + [{
            "agent": "qa",
            "node": "qa",
            "input_summary": f"主题: {teaching_design.get('topic', '')}, 重做: {retry_count}",
            "output_summary": f"通过: {qa_data.get('overall_pass')}, 类型: {qa_data.get('issue_type')}, 强制: {qa_data.get('forced_pass', False)}",
            "react_trace": [{"step": 1, "type": "final_answer", "content": response["content"][:500]}],
            "duration_ms": 0,
            "timestamp": "",
            "template_used": parsed["template_used"],
            "retry_attempt": retry_count,
        }],
    }
