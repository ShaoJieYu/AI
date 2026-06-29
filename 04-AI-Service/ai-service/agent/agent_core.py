"""
Agent 核心模块：Agent Loop（决策循环）

这是整个 Agent 的核心。大模型 + 工具 + 循环 = Agent。

循环逻辑：
    1. 把 messages + tools 发给模型
    2. 模型返回 tool_calls（要调工具）或 content（最终回答）
    3. 如果要调工具 → 执行工具 → 结果喂回模型 → 回到第 1 步
    4. 如果是最终回答 → 结束循环

整个过程中，模型是"决策者"，决定调什么工具、传什么参数、什么顺序；
我们的代码是"执行者"，负责执行工具并把结果喂回去。
"""
import json
import dashscope
from dashscope import Generation
from config import DASHSCOPE_API_KEY
from agent.tools import ALL_TOOLS
from agent.tool_executor import execute_tool

dashscope.api_key = DASHSCOPE_API_KEY

# Agent 系统提示词：告诉模型它的角色和可用工具
SYSTEM_PROMPT = """你是一个智能备课助手 Agent。你可以自主决策调用工具来完成用户的备课需求，并把结果保存到备课历史。

你的工作流程（严格按顺序执行）：
1. 收到用户的备课需求后，先调用 search_textbook 查找教材内容作为备课依据
2. 拿到教材内容后，调用 generate_lesson 生成五段式备课内容
3. 拿到 generate_lesson 返回的五段式内容后，调用 save_lesson_to_history 把内容保存到备课历史数据库
4. 保存成功后，向用户总结完成情况，告知用户可在备课历史页面查看

重要规则：
- 每次只调用一个工具，等拿到结果后再决定下一步
- 工具参数要从用户的原始需求中提取，不要编造
- 调用 save_lesson_to_history 时，必须把上一步 generate_lesson 返回的五个字段（coreDefinition/teachingAnalysis/mistakeWarnings/scoreBoosting/exampleDerivation）原样传给对应参数（core_definition/teaching_analysis/mistake_warnings/score_boosting/example_derivation），不要截断或改写
- 如果用户的需求不明确，先向用户提问确认
- 完成所有工作后，用中文向用户总结你做了什么，并告知备课记录已入库，可在备课历史页面查看"""


def run_agent(messages: list = None, user_message: str = None, token: str = None, max_iterations: int = 10) -> dict:
    """
    运行 Agent 决策循环。

    支持两种调用方式：
    1. 兼容旧方式：传 user_message，内部构建 messages（单个用户消息）
    2. 多轮对话：传 messages 列表（含 history），跳过初始化

    参数：
        messages: 完整对话消息列表（含 system/user/assistant/tool 消息）
        user_message: 用户的自然语言输入（兼容旧方式，当 messages 为空时使用）
        token: 用户 JWT token，透传给需要鉴权的工具（如 save_lesson_to_history）
        max_iterations: 最大循环次数（防止死循环）

    返回：
        {
            "final_answer": "模型的最终回答文本",
            "trace": [每一步的决策记录，用于调试和可视化]
        }
    """
    # 初始化消息列表
    if messages:
        # 多轮对话模式下，传入的 messages 已包含 system prompt 和完整历史
        # 确认第一条是 system message
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    else:
        # 兼容旧方式：单条用户消息
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message or ""}
        ]

    # 决策轨迹记录（每一步模型做了什么）
    trace = []

    for i in range(max_iterations):
        # 第 1 步：把 messages + tools 发给模型
        response = Generation.call(
            model="qwen-plus",
            messages=messages,
            tools=ALL_TOOLS,
            tool_choice="auto",
            result_format="message"
        )

        if response.status_code != 200:
            error_msg = f"API 调用失败（第{i+1}轮）: {response.message}"
            trace.append({"step": i + 1, "error": error_msg})
            return {"final_answer": error_msg, "trace": trace}

        message = response.output.choices[0].message

        # 第 2 步：检查模型是要调工具，还是给最终回答
        if message.get("tool_calls"):
            # 情况 A：模型要调工具
            messages.append(message)  # 保存模型的 tool_call 消息

            for tool_call in message["tool_calls"]:
                func_name = tool_call["function"]["name"]
                func_args_str = tool_call["function"]["arguments"]
                func_args = json.loads(func_args_str)

                # 记录决策轨迹
                trace.append({
                    "step": i + 1,
                    "action": "call_tool",
                    "tool": func_name,
                    "arguments": func_args
                })

                # 第 3 步：执行工具（透传 token 给需要鉴权的工具）
                result = execute_tool(func_name, func_args, token=token)

                trace.append({
                    "step": i + 1,
                    "action": "tool_result",
                    "tool": func_name,
                    "result_preview": result[:200] + "..." if len(result) > 200 else result
                })

                # 第 4 步：把结果喂回模型
                messages.append({
                    "role": "tool",
                    "content": result,
                    "name": func_name
                })

            # 继续循环，让模型看到结果后决定下一步
            continue

        else:
            # 情况 B：模型不调工具，直接给最终回答
            final_answer = message["content"]
            trace.append({
                "step": i + 1,
                "action": "final_answer",
                "answer_preview": final_answer[:200] + "..." if len(final_answer) > 200 else final_answer
            })

            return {"final_answer": final_answer, "trace": trace}

    # 超过最大循环次数
    return {
        "final_answer": "Agent 达到最大循环次数，未完成任务。",
        "trace": trace
    }


# ============================================================
# 阶段 3：单步骤执行模式（Planning 逐步执行）
# ============================================================

# 单步骤执行的系统提示词
STEP_EXECUTION_PROMPT = """你是一个智能备课助手 Agent。用户已经确认了执行计划，现在你要逐步执行。

当前需要执行的计划步骤是：第 {step} 步 - {step_name}
步骤说明：{step_description}
对应的工具：{tool}

请根据用户的原始需求和上下文，调用 {tool} 工具完成这一步。
- 每次只调用一个工具
- 工具参数要从用户的原始需求中提取
- 如果需要前一步的结果，可以从对话历史中获取
- 不要做计划之外的事情，只完成当前这一步"""


def run_agent_step(messages: list, plan_step: dict, token: str = None) -> dict:
    """
    执行计划中的单个步骤。

    参数：
        messages: 完整对话历史（含 system/user/assistant/tool 消息）
        plan_step: 当前步骤的信息 {"step": 1, "name": "检索教材", "description": "...", "tool": "search_textbook"}
        token: JWT token

    返回：
        {
            "type": "step_result",
            "step": 步骤序号,
            "step_name": 步骤名,
            "tool": 调用的工具名,
            "tool_args": 工具参数,
            "result": 工具返回结果,
            "trace": [决策轨迹]
        }
    """
    step_num = plan_step.get("step", 0)
    step_name = plan_step.get("name", "")
    step_desc = plan_step.get("description", "")
    tool_name = plan_step.get("tool", "")

    # 构造步骤执行的提示词
    step_prompt = STEP_EXECUTION_PROMPT.format(
        step=step_num,
        step_name=step_name,
        step_description=step_desc,
        tool=tool_name
    )

    # 在消息历史后追加步骤执行指令
    step_messages = list(messages)  # 复制，不修改原始列表
    step_messages.append({"role": "system", "content": step_prompt})

    trace = []

    # 调用通义千问，让 AI 生成工具调用
    response = Generation.call(
        model="qwen-plus",
        messages=step_messages,
        tools=ALL_TOOLS,
        tool_choice="auto",
        result_format="message"
    )

    if response.status_code != 200:
        error_msg = f"API 调用失败: {response.message}"
        return {
            "type": "step_result",
            "step": step_num,
            "step_name": step_name,
            "tool": tool_name,
            "tool_args": {},
            "result": error_msg,
            "trace": [{"step": step_num, "error": error_msg}],
            "success": False
        }

    message = response.output.choices[0].message

    # 检查是否调用了工具
    if message.get("tool_calls"):
        for tool_call in message["tool_calls"]:
            func_name = tool_call["function"]["name"]
            func_args_str = tool_call["function"]["arguments"]
            try:
                func_args = json.loads(func_args_str)
            except json.JSONDecodeError:
                func_args = {}

            trace.append({
                "step": step_num,
                "action": "call_tool",
                "tool": func_name,
                "arguments": func_args
            })

            # 执行工具
            result = execute_tool(func_name, func_args, token=token)

            trace.append({
                "step": step_num,
                "action": "tool_result",
                "tool": func_name,
                "result_preview": result[:200] + "..." if len(result) > 200 else result
            })

            return {
                "type": "step_result",
                "step": step_num,
                "step_name": step_name,
                "tool": func_name,
                "tool_args": func_args,
                "result": result,
                "trace": trace,
                "success": True
            }

    # AI 没有调工具，可能是给了文字说明
    return {
        "type": "step_result",
        "step": step_num,
        "step_name": step_name,
        "tool": tool_name,
        "tool_args": {},
        "result": message.get("content", "步骤执行完成，但未调用工具"),
        "trace": trace,
        "success": True
    }


def generate_summary(messages: list, plan: list, token: str = None) -> dict:
    """
    所有步骤执行完成后，生成总结。

    参数：
        messages: 完整对话历史
        plan: 完整计划（含每步状态）

    返回：
        {
            "type": "summary",
            "summary": "总结文本"
        }
    """
    # 构造计划摘要
    plan_summary = "\n".join([
        f"第{s['step']}步 [{s.get('status', 'completed')}]: {s['name']} - {s.get('description', '')}"
        for s in plan
    ])

    summary_prompt = f"""所有计划步骤已执行完成。请根据对话历史和执行结果，用中文向用户总结：
1. 完成了什么任务
2. 每一步的关键结果
3. 用户可以在哪里查看结果

执行计划：
{plan_summary}

请直接给出总结，不要调工具。"""

    summary_messages = list(messages)
    summary_messages.append({"role": "system", "content": summary_prompt})

    response = Generation.call(
        model="qwen-plus",
        messages=summary_messages,
        result_format="message"
    )

    if response.status_code == 200:
        summary = response.output.choices[0].message["content"]
    else:
        summary = "所有步骤已执行完成。"

    return {
        "type": "summary",
        "summary": summary
    }
