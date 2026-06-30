"""
导出 Agent

职责：把五段式内容优化为符合 PDF 导出规范的 Markdown。
实现方式：纯 LLM 调用（无工具，排版优化是 LLM 原生能力）

注意：PDF 实际导出功能复用阶段 1 的后端 PDF 导出接口，
本 Agent 只负责内容排版优化，pdf_url 暂设为 None（后续 Step 6/7 对接后端）。
"""
import json
from typing import Dict, Any
from pydantic import ValidationError

from common.llm import llm
from multi_agent.prompts import EXPORT_PROMPT
from multi_agent.schema import ExportResult
from multi_agent.agents.teaching_design import repair_common_json_errors


def parse_and_validate_export_result(raw_output: str) -> Dict[str, Any]:
    """四层保障：解析 + 校验 + 兜底修复"""
    try:
        repaired = repair_common_json_errors(raw_output)
        data = json.loads(repaired)
        result = ExportResult(**data)
        return {"success": True, "data": result.model_dump(), "template_used": False, "error": None}
    except json.JSONDecodeError as e:
        json_error = f"JSON 解析失败: {str(e)}"
    except ValidationError as e:
        json_error = f"Schema 校验失败: {str(e)[:500]}"
    except Exception as e:
        json_error = f"解析异常: {str(e)}"

    # 第 4 层第 3 级：模板兜底（直接用原始内容作为优化结果）
    print(f"[导出 Agent] 兜底修复失败，使用原始内容: {json_error}")
    return {
        "success": True,
        "data": {
            "optimized_content": "（导出 Agent 异常，使用原始内容）",
            "pdf_url": None,
            "export_status": "failed",
            "forced_pass_note": None,
        },
        "template_used": True,
        "error": json_error,
    }


def export_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    导出 Agent 节点函数（供 LangGraph 调用）。
    """
    content_draft = state.get("content_draft", {})
    qa_result = state.get("qa_result", {})
    retry_count = state.get("retry_count", 0)
    max_retry = state.get("max_retry", 3)

    # 检查是否强制通过
    forced_pass_note = ""
    if qa_result.get("forced_pass"):
        forced_pass_note = f"【强制通过提示】质检未完全通过（重做 {retry_count} 次后强制导出）。"

    # 构造 prompt
    prompt = EXPORT_PROMPT.format(
        content_draft=json.dumps(content_draft, ensure_ascii=False),
        forced_pass_note=forced_pass_note,
    )

    # 纯 LLM 调用（无工具）
    response = llm.chat(
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=8192,
        temperature=0.5,
    )

    if not response["success"]:
        print(f"[导出 Agent] LLM 调用失败: {response['error']}")
        return {
            "export_result": {
                "optimized_content": json.dumps(content_draft, ensure_ascii=False),
                "pdf_url": None,
                "export_status": "failed",
                "forced_pass_note": forced_pass_note or None,
            },
            "current_node": "export",
            "status": "success",
            "agent_trace": state.get("agent_trace", []) + [{
                "agent": "export",
                "node": "export",
                "input_summary": f"主题: {content_draft.get('topic', '')}",
                "output_summary": "LLM 失败，使用原始内容",
                "react_trace": [{"step": 1, "type": "error", "content": response["error"]}],
                "duration_ms": 0,
                "timestamp": "",
                "template_used": True,
                "retry_attempt": 0,
            }],
        }

    # 四层保障：解析 + 校验
    parsed = parse_and_validate_export_result(response["content"])

    return {
        "export_result": parsed["data"],
        "current_node": "export",
        "status": "success",
        "agent_trace": state.get("agent_trace", []) + [{
            "agent": "export",
            "node": "export",
            "input_summary": f"主题: {content_draft.get('topic', '')}",
            "output_summary": f"导出状态: {parsed['data'].get('export_status', '')}",
            "react_trace": [{"step": 1, "type": "final_answer", "content": response["content"][:500]}],
            "duration_ms": 0,
            "timestamp": "",
            "template_used": parsed["template_used"],
            "retry_attempt": 0,
        }],
    }
