"""
工具定义模块

每个工具用 JSON Schema 描述，告诉大模型"有这个工具可以用、它接受什么参数"。
大模型不会真的执行这些函数，它只输出"我要调用 xxx 工具，参数是 yyy"，
由我们的代码（tool_executor.py）负责实际执行。
"""
import json

# ============================================================
# 工具 1：search_textbook（搜索教材内容）
# 阶段 2 做 RAG 之前，先用静态模拟数据
# ============================================================
search_textbook_tool = {
    "type": "function",
    "function": {
        "name": "search_textbook",
        "description": "根据关键词和学科搜索教材内容，返回相关章节的原文片段。用于备课前查找教材依据。",
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词，如'静电场'、'一般过去时'、'牛顿第二定律'"
                },
                "subject": {
                    "type": "string",
                    "enum": ["物理", "化学", "生物", "数学", "英语", "语文"],
                    "description": "学科"
                }
            },
            "required": ["keyword", "subject"]
        }
    }
}

# ============================================================
# 工具 2：generate_lesson（生成五段式备课内容）
# 复用现有的 tongyi_service.generate_lesson
# ============================================================
generate_lesson_tool = {
    "type": "function",
    "function": {
        "name": "generate_lesson",
        "description": "生成五段式备课内容（教材核心原文、教学深度剖析、易错点拨、提分技巧、经典例题推导）。调用此工具前建议先用 search_textbook 查找教材依据。",
        "parameters": {
            "type": "object",
            "properties": {
                "subject": {
                    "type": "string",
                    "enum": ["物理", "化学", "生物", "数学", "英语", "语文"],
                    "description": "学科"
                },
                "teaching_goal": {
                    "type": "string",
                    "description": "教学目标/主题，如'静电场'、'一般过去时'"
                },
                "difficulty": {
                    "type": "string",
                    "description": "难度等级：简单/中等/困难"
                },
                "duration": {
                    "type": "integer",
                    "description": "课程时长（分钟），如 45"
                }
            },
            "required": ["subject", "teaching_goal"]
        }
    }
}

# ============================================================
# 工具 3：save_lesson_to_history（保存备课内容到数据库）
# 调用后端 POST /lessons/save 接口，由后端处理鉴权和入库
# ============================================================
save_lesson_to_history_tool = {
    "type": "function",
    "function": {
        "name": "save_lesson_to_history",
        "description": "把已生成的五段式备课内容保存到备课历史数据库，供用户在备课历史页面查看、删除、导出 PDF。调用此工具前必须先调用 generate_lesson 拿到完整五段式内容。",
        "parameters": {
            "type": "object",
            "properties": {
                "subject": {
                    "type": "string",
                    "enum": ["物理", "化学", "生物", "数学", "英语", "语文"],
                    "description": "学科"
                },
                "teaching_goal": {
                    "type": "string",
                    "description": "教学目标/主题，如'静电场'、'一般过去时'"
                },
                "difficulty": {
                    "type": "string",
                    "description": "难度等级：基础/中等/提高"
                },
                "duration": {
                    "type": "integer",
                    "description": "课程时长（分钟），如 45"
                },
                "core_definition": {
                    "type": "string",
                    "description": "教材核心原文内容（generate_lesson 工具返回的 coreDefinition 字段原文）"
                },
                "teaching_analysis": {
                    "type": "string",
                    "description": "教学深度剖析内容（generate_lesson 工具返回的 teachingAnalysis 字段原文）"
                },
                "mistake_warnings": {
                    "type": "string",
                    "description": "易错点拨内容（generate_lesson 工具返回的 mistakeWarnings 字段原文）"
                },
                "score_boosting": {
                    "type": "string",
                    "description": "提分技巧内容（generate_lesson 工具返回的 scoreBoosting 字段原文）"
                },
                "example_derivation": {
                    "type": "string",
                    "description": "经典例题推导内容（generate_lesson 工具返回的 exampleDerivation 字段原文）"
                }
            },
            "required": ["subject", "teaching_goal", "core_definition", "teaching_analysis", "mistake_warnings", "score_boosting", "example_derivation"]
        }
    }
}

# ============================================================
# 所有可用工具列表（传给大模型）
# ============================================================
ALL_TOOLS = [search_textbook_tool, generate_lesson_tool, save_lesson_to_history_tool]
