"""
Multi-Agent 工具定义和执行器

阶段 4 的 4 个 Agent 通过本模块定义工具 schema 和执行工具。
工具的实际执行函数复用阶段 3 的 agent/tool_executor.py 的 TOOL_REGISTRY，
避免重复实现。

新增工具：
- get_student_weak_points: 查询学生薄弱知识点（教学设计 Agent 用）
"""
import json
import re
import requests
from agent.tool_executor import search_textbook, generate_lesson, save_lesson_to_history

# 后端服务地址
BACKEND_URL = "http://localhost:8080/api"


# ============================================================
# Unit 编号提取（程序化兜底，防止 LLM 漏传 unit 参数）
# ============================================================
# 匹配模式（按优先级排序）：
#   "unit": 6（JSON 字段，内容生成 Agent 接收教学设计 JSON 时用）
#   "Unit 6" / "Unit6" / "UNIT 6"（英文，空格可选）
#   "第 6 单元" / "第6单元" / "第 6单元"（中文，空格可选，支持中文数字）
#   "第 6 章" / "第6章" / "第三章"（中文章节，支持中文数字）
# 数字部分同时支持阿拉伯数字（1-30）和中文数字（一至十）
_UNIT_PATTERNS = [
    re.compile(r'"unit"\s*:\s*(\d+)', re.IGNORECASE),
    re.compile(r"\bUnit\s*(\d+)\b", re.IGNORECASE),
    re.compile(r"第\s*(\d+)\s*单元"),
    re.compile(r"第\s*(\d+)\s*章"),
    # 中文数字（一到十）支持，放在阿拉伯数字之后作为兜底
    re.compile(r"第\s*([一二三四五六七八九十])\s*单元"),
    re.compile(r"第\s*([一二三四五六七八九十])\s*章"),
]

# 中文数字转 int 的映射
_CN_NUM_MAP = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
}


# ============================================================
# 主题词 → 章号映射（教材章标题主题词兜底）
# ============================================================
# 当用户输入里没有 "Unit N" / "第N章" 等显式编号时，
# 通过主题词识别所属章节。每本教材按学科独立维护。
#
# 设计原因：LLM 难以稳定传递 unit 参数（项目记忆记录的经验），
# 用户输入也常常只说主题（"圆周运动"）不说章节号，
# 主题词映射是确保 100% 命中 unit 的最后一道兜底。
#
# 维护方式：每入库一本新教材，在该教材的章节边界检测通过后，
# 将章节标题中的核心主题词加入此表。
TOPIC_TO_UNIT = {
    # 人教版物理必修第二册（4 章）
    "抛体运动": 5, "平抛": 5, "斜抛": 5, "平抛运动": 5, "曲线运动": 5,
    "圆周运动": 6, "匀速圆周": 6, "向心力": 6, "向心加速度": 6, "线速度": 6, "角速度": 6,
    "万有引力": 7, "引力定律": 7, "行星运动": 7, "卫星": 7, "开普勒": 7,
    "机械能": 8, "动能定理": 8, "势能": 8, "能量守恒": 8, "动能": 8, "功": 8,
}


def extract_unit_from_text(text: str):
    """
    从字符串中提取 Unit 编号（程序化兜底）。

    支持三种识别模式，按优先级匹配：
    1. 显式编号模式："Unit 6"、"第 6 单元"、"第 6 章"、"第三章"、"unit": 6（JSON 字段）
    2. 主题词映射：用户输入提到"圆周运动"等主题词时，返回对应章号
       （用于用户只说主题不说章节号的场景）

    Args:
        text: 待提取的字符串（如用户需求或教学设计 JSON）

    Returns:
        int: 提取到的 Unit 编号；未匹配到返回 None
    """
    if not text:
        return None

    # 优先级 1：显式编号模式（Unit N / 第N章 / JSON "unit": N）
    for pattern in _UNIT_PATTERNS:
        m = pattern.search(text)
        if not m:
            continue
        raw = m.group(1)
        # 先尝试阿拉伯数字
        try:
            unit = int(raw)
        except ValueError:
            # 再尝试中文数字
            unit = _CN_NUM_MAP.get(raw)
            if unit is None:
                continue
        if 1 <= unit <= 30:  # 合理范围校验，避免误匹配日期/页码
            return unit

    # 优先级 2：主题词映射（用户只说主题"圆周运动"不说章节号时的兜底）
    # 按主题词长度倒序匹配，优先匹配更具体的关键词
    # （如"平抛运动"优先于"平抛"，避免短词误命中）
    for topic in sorted(TOPIC_TO_UNIT.keys(), key=len, reverse=True):
        if topic in text:
            return TOPIC_TO_UNIT[topic]

    return None


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
            "如 'Unit 6 Rain or Shine weather' 或 '牛顿第二定律 F=ma'，"
            "比单独一个主题词命中更精准。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词，建议组合：单元编号+章节标题+主题词，如 'Unit 6 Rain or Shine weather'、'静电场 库仑定律'、'一般过去时 动词变形'"
                },
                "subject": {
                    "type": "string",
                    "description": "学科（中文）：物理/化学/生物/数学/英语/语文/历史/地理/政治",
                    "enum": ["物理", "化学", "生物", "数学", "英语", "语文", "历史", "地理", "政治"]
                },
                "unit": {
                    "type": "integer",
                    "description": "可选，指定 Unit 编号（如 6 表示只在第 6 单元范围内检索），避免前言/目录等非课文内容干扰。如果用户提到'第 N 单元'或'Unit N'，应传入此参数。"
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


def execute_multi_agent_tool(name: str, arguments: dict, token: str = None,
                             unit_hint: int = None) -> str:
    """
    执行 Multi-Agent 工具的统一入口。

    参数：
        name: 工具名
        arguments: 参数字典
        token: JWT token（save_lesson_to_history 需要）
        unit_hint: 程序化提取的 Unit 编号（兜底用）。当 LLM 调用 search_textbook
                   但未传 unit 参数时，自动注入此值，避免检索到前言/目录等无关内容。

    返回：
        工具执行结果字符串
    """
    # 程序化兜底：search_textbook 的 unit 参数强制使用 unit_hint
    # 用户输入是最可靠的信号，LLM 可能传错 unit（如把第六章写成 Unit 5）
    # 所以：LLM 没传 unit → 注入 unit_hint；LLM 传了但和 unit_hint 冲突 → 覆盖
    if name == "search_textbook" and unit_hint is not None:
        old_unit = arguments.get("unit")
        if old_unit != unit_hint:
            arguments["unit"] = unit_hint
            if old_unit is None:
                print(f"[工具兜底] search_textbook 未传 unit，自动注入 unit={unit_hint}")
            else:
                print(f"[工具兜底] search_textbook unit={old_unit} 与用户输入 unit_hint={unit_hint} 冲突，强制覆盖")

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
