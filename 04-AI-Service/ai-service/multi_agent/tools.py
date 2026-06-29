"""
Multi-Agent 工具定义和执行器

阶段 4 的 4 个 Agent 通过本模块定义工具 schema 和执行工具。
工具的实际执行函数复用阶段 3 的 agent/tool_executor.py 的 TOOL_REGISTRY，
避免重复实现。

新增工具：
- get_student_weak_points: 查询学生薄弱知识点（教学设计 Agent 用）
"""
import json
import requests
from agent.tool_executor import search_textbook, generate_lesson, save_lesson_to_history

# 后端服务地址
BACKEND_URL = "http://localhost:8080/api"


# ============================================================
# 新增工具：get_student_weak_points（查询学生薄弱知识点）
# ============================================================
def get_student_weak_points(student_id: str, subject: str) -> str:
    """
    查询指定学生在指定学科的薄弱知识点。

    调用后端 GET /students/{studentId}/weak-points 接口，
    返回该学生 masteryLevel=WEAK 的知识点列表。
    """
    try:
        resp = requests.get(
            f"{BACKEND_URL}/students/{student_id}/weak-points",
            params={"subject": subject},
            timeout=10,
        )
        if resp.status_code != 200:
            return f"查询失败：HTTP {resp.status_code}"

        data = resp.json()
        if data.get("code") != 200:
            return f"查询失败：{data.get('message', '未知错误')}"

        weak_points = data.get("data", [])
        if not weak_points:
            return f"学生 {student_id} 在 {subject} 学科暂无薄弱知识点记录"

        # 格式化输出
        lines = [f"学生 {student_id} 在 {subject} 学科的薄弱知识点："]
        for wp in weak_points:
            kp = wp.get("knowledgePoint", "")
            mastery = wp.get("masteryLevel", "")
            lines.append(f"- {kp}（掌握程度：{mastery}）")
        return "\n".join(lines)

    except requests.exceptions.RequestException as e:
        return f"调用后端服务失败：{str(e)}"
    except Exception as e:
        return f"查询过程出错：{str(e)}"


# ============================================================
# Multi-Agent 工具注册表（复用阶段 3 + 新增）
# ============================================================
MULTI_AGENT_TOOL_REGISTRY = {
    "search_textbook": search_textbook,
    "generate_lesson": generate_lesson,
    "save_lesson_to_history": save_lesson_to_history,
    "get_student_weak_points": get_student_weak_points,
}


# ============================================================
# Multi-Agent 工具 schema（传给大模型）
# ============================================================
search_textbook_tool = {
    "type": "function",
    "function": {
        "name": "search_textbook",
        "description": (
            "根据关键词和学科搜索教材内容，返回相关章节的原文片段。用于备课前查找教材依据。"
            "关键词建议组合使用：单元编号 + 章节标题 + 主题词，"
            "如 'Unit 6 Weather and Mood' 或 '牛顿第二定律 F=ma'，"
            "比单独一个主题词命中更精准。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词，建议组合：单元编号+章节标题+主题词，如 'Unit 6 Weather and Mood'、'静电场 库仑定律'、'一般过去时 动词变形'"
                },
                "subject": {
                    "type": "string",
                    "description": "学科（中文）：物理/化学/生物/数学/英语/语文/历史/地理/政治",
                    "enum": ["物理", "化学", "生物", "数学", "英语", "语文", "历史", "地理", "政治"]
                }
            },
            "required": ["keyword", "subject"]
        }
    }
}

get_student_weak_points_tool = {
    "type": "function",
    "function": {
        "name": "get_student_weak_points",
        "description": "查询指定学生在指定学科的薄弱知识点。教学设计时参考学生薄弱点可以做到针对性教学。",
        "parameters": {
            "type": "object",
            "properties": {
                "student_id": {
                    "type": "string",
                    "description": "学生 ID"
                },
                "subject": {
                    "type": "string",
                    "description": "学科（中文）：物理/化学/生物/数学/英语/语文/历史/地理/政治",
                    "enum": ["物理", "化学", "生物", "数学", "英语", "语文", "历史", "地理", "政治"]
                }
            },
            "required": ["student_id", "subject"]
        }
    }
}

# 教学设计 Agent 可用的工具
TEACHING_DESIGN_TOOLS = [search_textbook_tool, get_student_weak_points_tool]

# 内容生成 Agent 可用的工具
CONTENT_GENERATION_TOOLS = [search_textbook_tool]


def execute_multi_agent_tool(name: str, arguments: dict, token: str = None) -> str:
    """
    执行 Multi-Agent 工具的统一入口。

    参数：
        name: 工具名
        arguments: 参数字典
        token: JWT token（save_lesson_to_history 需要）

    返回：
        工具执行结果字符串
    """
    func = MULTI_AGENT_TOOL_REGISTRY.get(name)
    if not func:
        return f"错误：未知的工具 '{name}'"

    try:
        if name == "save_lesson_to_history":
            result = func(_token=token, **arguments)
        else:
            result = func(**arguments)
        return result
    except Exception as e:
        return f"工具执行出错：{name}({arguments}) -> {str(e)}"
