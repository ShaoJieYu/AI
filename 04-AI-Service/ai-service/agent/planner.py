"""
Agent 规划模块（阶段 3：Planning 自主规划）

核心思想：让 Agent 在执行任务前先制定计划，而不是走一步看一步。

采用混合规划策略：
  - 模板兜底：备课类任务至少有"检索教材 → 生成内容 → 保存历史"三步
  - AI 动态增减：AI 根据用户输入决定是否增加额外步骤（如查薄弱点、生成练习）

类比：就像做菜——菜谱是模板（必须有备料、烹饪、装盘三步），
但厨师可以根据客人要求加步骤（如多加一步腌制、多加一步摆盘装饰）。
"""
import json
import re
from dashscope import Generation
from config import DASHSCOPE_API_KEY

Generation.api_key = DASHSCOPE_API_KEY


# ============================================================
# 备课任务的固定模板步骤（兜底用）
# ============================================================
BASE_LESSON_PLAN_STEPS = [
    {
        "step": 1,
        "name": "检索教材",
        "description": "根据用户的教学主题和学科，搜索教材中相关章节的内容",
        "tool": "search_textbook",
        "status": "pending"
    },
    {
        "step": 2,
        "name": "生成五段式备课内容",
        "description": "基于教材内容，生成教材核心原文、教学深度剖析、易错点拨、提分技巧、经典例题推导",
        "tool": "generate_lesson",
        "status": "pending"
    },
    {
        "step": 3,
        "name": "保存到备课历史",
        "description": "把生成的五段式备课内容保存到数据库，供后续查看、导出 PDF",
        "tool": "save_lesson_to_history",
        "status": "pending"
    }
]


# AI 规划提示词：让模型分析用户输入，决定是否在模板基础上增减步骤
PLANNER_PROMPT = """你是一个备课系统的任务规划助手。用户输入了备课需求，你需要分析这个需求，决定执行计划。

基础计划（必须包含，不可省略）：
1. 检索教材 - 根据主题搜索教材内容
2. 生成五段式备课内容 - 生成完整备课
3. 保存到备课历史 - 入库

你可以根据用户需求在基础步骤之间动态插入额外步骤。例如：
- 如果用户提到了学生姓名或学情 → 在"检索教材"后插入"查询学生薄弱知识点"步骤
- 如果用户要求导出 PDF → 在"保存到备课历史"后插入"导出 PDF"步骤
- 如果用户要求生成课堂练习 → 在"生成备课内容"后插入"生成针对性练习"步骤

请直接返回 JSON 数组，每个元素包含 step（序号）、name（步骤名）、description（步骤说明）、tool（对应工具名）。
不要返回其他任何文字。

示例输入："帮我备一节一般过去时的英语课"
示例输出：
[
  {"step": 1, "name": "检索教材", "description": "搜索英语教材中一般过去时相关章节", "tool": "search_textbook"},
  {"step": 2, "name": "生成五段式备课内容", "description": "基于教材内容生成一般过去时的完整备课", "tool": "generate_lesson"},
  {"step": 3, "name": "保存到备课历史", "description": "把备课内容入库", "tool": "save_lesson_to_history"}
]

示例输入："帮我备一节静电场的物理课，学生是张三"
示例输出：
[
  {"step": 1, "name": "检索教材", "description": "搜索物理教材中静电场相关章节", "tool": "search_textbook"},
  {"step": 2, "name": "查询学生薄弱知识点", "description": "查询张三在物理学科的薄弱知识点", "tool": "check_weak_points"},
  {"step": 3, "name": "生成五段式备课内容", "description": "基于教材内容和薄弱点生成备课，侧重讲解薄弱环节", "tool": "generate_lesson"},
  {"step": 4, "name": "保存到备课历史", "description": "把备课内容入库", "tool": "save_lesson_to_history"}
]
"""


def generate_plan(user_message: str) -> dict:
    """
    生成执行计划（混合策略：模板兜底 + AI 动态增减）。

    参数：
        user_message: 用户的自然语言输入

    返回：
        {
            "type": "plan",
            "plan": [步骤列表],
            "user_message": 原始用户输入
        }
    """
    # 调用通义千问分析用户需求，生成动态计划
    try:
        response = Generation.call(
            model="qwen-plus",
            messages=[
                {"role": "system", "content": PLANNER_PROMPT},
                {"role": "user", "content": user_message}
            ],
            result_format="message"
        )

        if response.status_code == 200:
            content = response.output.choices[0].message["content"].strip()

            # 提取 JSON（兼容模型可能返回 markdown 代码块的情况）
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                plan_steps = json.loads(json_match.group())

                # 重新编号，确保连续
                for i, step in enumerate(plan_steps):
                    step["step"] = i + 1
                    step["status"] = "pending"

                return {
                    "type": "plan",
                    "plan": plan_steps,
                    "user_message": user_message
                }
    except Exception as e:
        print(f"[Planner] AI 规划失败，使用模板兜底: {e}")

    # 兜底：使用固定模板
    return {
        "type": "plan",
        "plan": [dict(s) for s in BASE_LESSON_PLAN_STEPS],
        "user_message": user_message
    }
