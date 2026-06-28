"""
工具执行器

大模型输出"我要调用 xxx 工具"后，由本模块负责实际执行对应函数，
并把执行结果转成字符串，喂回给大模型。

这就是 Function Calling 的核心：模型负责"决策"，我们负责"执行"。
"""
import json
import requests
from services.tongyi_service import generate_lesson as _generate_lesson

# 后端 Spring Boot 服务地址
BACKEND_URL = "http://localhost:8080/api"


def search_textbook(keyword: str, subject: str) -> str:
    """
    搜索教材内容（阶段 1 用静态模拟数据，阶段 2 换成 RAG 检索）。
    """
    # 模拟教材库
    mock_textbook = {
        "物理": {
            "静电场": "【人教版高中物理选修3-1 第一章 静电场】电荷守恒定律：电荷既不会创生，也不会消灭，它只能从一个物体转移到另一个物体，或者从物体的一部分转移到另一部分；在转移过程中，电荷的总量保持不变。库仑定律：真空中两个静止点电荷之间的相互作用力，与它们的电荷量的乘积成正比，与它们的距离的二次方成反比。公式：F = k*q1*q2/r²，k=9.0×10⁹ N·m²/C²。",
            "牛顿第二定律": "【人教版高中物理必修1 第四章 牛顿运动定律】牛顿第二定律：物体加速度的大小跟作用力成正比，跟物体的质量成反比，加速度的方向跟作用力的方向相同。公式：F = ma。",
        },
        "英语": {
            "一般过去时": "【人教版初中英语八年级上册 Unit 11】一般过去时：表示过去某个时间发生的动作或存在的状态。基本结构：主语 + 动词过去式。规则动词过去式变化：①一般加-ed；②以e结尾加-d；③以辅音字母+y结尾，变y为i加-ed；④重读闭音节结尾双写末尾辅音字母加-ed。",
            "现在完成时": "【人教版初中英语九年级 Unit 8】现在完成时：表示过去发生或已经完成的动作对现在造成的影响或结果。结构：have/has + 过去分词。",
        }
    }

    subject_lib = mock_textbook.get(subject, {})
    result = subject_lib.get(keyword)

    if result:
        return result
    else:
        return f"未找到{subject}学科中关键词为'{keyword}'的教材内容。可尝试的关键词：{list(subject_lib.keys())}"


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
