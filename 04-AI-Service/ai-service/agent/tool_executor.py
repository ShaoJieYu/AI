"""
工具执行器

大模型输出"我要调用 xxx 工具"后，由本模块负责实际执行对应函数，
并把执行结果转成字符串，喂回给大模型。

这就是 Function Calling 的核心：模型负责"决策"，我们负责"执行"。
"""
import json
import requests
from services.tongyi_service import generate_lesson as _generate_lesson

# 后端 Spring Boot 服务地址（用于备课历史保存等接口）
BACKEND_URL = "http://localhost:8080/api"


def search_textbook(keyword: str, subject: str, unit: int = None) -> str:
    """
    搜索教材内容（阶段 2 起改用 Chroma 向量库真实检索）。

    从对应学科的 Chroma collection 中检索 top-6 相关片段，
    每条带相似度分数、教材名、页码、Unit 信息。相似度低于 0.40 的片段会被过滤，
    避免低质量检索结果误导 LLM。如果该学科未入库，返回友好提示。

    参数：
        keyword: 检索关键词，建议组合使用"Unit 编号 + 章节标题 + 主题词"
                 比单独主题词命中更精准
        subject: 学科（中文九学科：物理/化学/生物/数学/英语/语文/历史/地理/政治）
        unit: 可选，指定 Unit 编号（如 6），只在对应 Unit 范围内检索，
              避免前言/目录等非课文内容干扰
    """
    try:
        from rag.vector_store import search_as_text
        where = {"unit": unit} if unit else None
        return search_as_text(
            query=keyword, subject=subject, top_k=6, min_score=0.40, where=where
        )
    except ImportError:
        return (
            f"【检索失败】RAG 模块未安装，请确保 rag/ 目录存在且依赖已安装。"
            f"（查询：{subject} - {keyword}）"
        )
    except Exception as e:
        return (
            f"【检索出错】{subject} - {keyword}：{str(e)}。"
            f"可能原因：向量库未初始化或 embedding 服务异常。"
        )


def generate_lesson(subject: str, teaching_goal: str,
                    difficulty: str = "中等", duration: int = 45) -> str:
    """
    生成五段式备课内容，复用现有的 tongyi_service。
    """
    result = _generate_lesson(
        subject=subject,
        goal=teaching_goal,
        difficulty=difficulty,
        duration=duration
    )
    # 把 dict 转成字符串喂回模型
    return json.dumps(result, ensure_ascii=False)


def save_lesson_to_history(subject: str, teaching_goal: str,
                           core_definition: str, teaching_analysis: str,
                           mistake_warnings: str, score_boosting: str,
                           example_derivation: str,
                           difficulty: str = "中等", duration: int = 45,
                           _token: str = None) -> str:
    """
    把 Agent 已生成的五段式备课内容保存到后端数据库。

    通过 HTTP 调用后端 POST /lessons/save 接口，
    后端从 JWT token 自动提取 tutorId 完成入库。

    _token 参数由 execute_tool 从上下文注入，不暴露给大模型。
    """
    if not _token:
        return "错误：缺少用户身份凭证（token），无法保存到备课历史。"

    payload = {
        "subject": subject,
        "teachingGoal": teaching_goal,
        "difficulty": difficulty,
        "duration": duration,
        "coreDefinition": core_definition,
        "teachingAnalysis": teaching_analysis,
        "mistakeWarnings": mistake_warnings,
        "scoreBoosting": score_boosting,
        "exampleDerivation": example_derivation,
    }

    headers = {
        "Authorization": f"Bearer {_token}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            f"{BACKEND_URL}/lessons/save",
            json=payload,
            headers=headers,
            timeout=30,
        )
        if resp.status_code != 200:
            return f"保存失败：HTTP {resp.status_code} - {resp.text}"

        data = resp.json()
        # 后端统一响应格式：{code, message, data: {...}}
        if data.get("code") != 200:
            return f"保存失败：{data.get('message', '未知错误')}"

        lesson_plan = data.get("data", {})
        lesson_id = lesson_plan.get("id")
        title = lesson_plan.get("title")
        return f"保存成功！备课记录已入库，ID={lesson_id}，标题='{title}'。用户可在备课历史页面查看。"

    except requests.exceptions.RequestException as e:
        return f"调用后端服务失败：{str(e)}"
    except Exception as e:
        return f"保存过程出错：{str(e)}"


# ============================================================
# 工具注册表：函数名 -> 实际执行的函数
# 大模型输出 {"name": "search_textbook", "arguments": {...}}
# 我们在这里查表找到对应的 Python 函数并执行
# ============================================================
TOOL_REGISTRY = {
    "search_textbook": search_textbook,
    "generate_lesson": generate_lesson,
    "save_lesson_to_history": save_lesson_to_history,
}


def execute_tool(name: str, arguments: dict, token: str = None) -> str:
    """
    执行工具的统一入口。

    参数：
        name: 工具名，如 "search_textbook"
        arguments: 参数字典，如 {"keyword": "静电场", "subject": "物理"}
        token: 用户 JWT token，仅 save_lesson_to_history 需要，用于后端鉴权

    返回：
        工具执行结果的字符串（会作为 role=tool 消息喂回大模型）
    """
    func = TOOL_REGISTRY.get(name)
    if not func:
        return f"错误：未知的工具 '{name}'"

    try:
        # save_lesson_to_history 需要透传 token 给后端做鉴权
        if name == "save_lesson_to_history":
            result = func(_token=token, **arguments)
        else:
            result = func(**arguments)
        return result
    except Exception as e:
        return f"工具执行出错：{name}({arguments}) -> {str(e)}"
