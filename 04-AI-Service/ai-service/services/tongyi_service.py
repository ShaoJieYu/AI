import dashscope
from dashscope import Generation
from config import DASHSCOPE_API_KEY

dashscope.api_key = DASHSCOPE_API_KEY

# 备课模式中文映射
MODE_LABELS = {
    "new_lesson": "新课讲解",
    "exercise": "习题讲解",
    "review": "考前复习",
    "remedial": "查漏补缺",
    "advanced": "培优拔高",
    "preview": "假期预习",
}

def generate_lesson(subject: str, goal: str, difficulty: str, student: dict = None,
                    mode: str = None, duration: int = None, custom_requirements: str = None,
                    weak_points: list = None) -> dict:
    student_info = ""
    if student:
        student_info = f"\n学生信息：{student.get('name', '')}，{student.get('grade', '')}，学习基础：{student.get('learningBasics', '')}"

    # 学生薄弱知识点
    weak_points_info = ""
    if weak_points:
        wp_list = [wp.get("knowledgePoint", "") for wp in weak_points if wp.get("masteryLevel") == "WEAK"]
        if wp_list:
            weak_points_info = f"\n该生薄弱知识点：{'、'.join(wp_list)}。备课应侧重这些知识点，针对性突破。"

    mode_info = ""
    if mode:
        mode_label = MODE_LABELS.get(mode, mode)
        mode_info = f"\n备课模式：{mode_label}"

    duration_info = ""
    if duration:
        duration_info = f"\n课程时长：{duration}分钟"

    requirements_info = ""
    if custom_requirements:
        requirements_info = f"\n教学备注与教材信息：{custom_requirements}"

    # 学科类型判定：理科才强制 LaTeX 公式，文科/语言类禁止伪公式
    is_stem_subject = subject in ["物理", "化学", "生物", "数学"]
    if is_stem_subject:
        formula_requirement = """2. 全文使用 Markdown 格式；如涉及公式，一律使用 LaTeX 语法：行内公式用 $...$，独立公式用 $$...$$。严禁把非公式文本（如中文定义、英文单词、纯文字规则）用 $...$ 包裹。"""
        core_definition_formula = "- 列出全部相关公式（用 LaTeX 独立公式 $$...$$ 排版），并标注每个符号的物理意义与单位；\n- 给出关键常数取值、适用条件、单位制说明；"
        example_formula = "关键步骤写出依据（如\"由某某定律得\"），公式用 LaTeX 排版；"
    else:
        formula_requirement = """2. 全文使用 Markdown 格式。本课为非理科内容，严禁使用 LaTeX 公式（不得出现 $...$ 或 $$...$$），也不得把语法规则、句型结构、文字定义套用数学公式形式表达；如需表达结构关系，用普通文字、表格或缩进列表即可。
3. 【强制排版规范，违反视为不合格】
   - 关键定义/教材原文/核心规则/定理的权威表述，必须用 Markdown 引用块（> ...）单独成框，前后各空一行
   - 规则条款、变化形式、步骤说明、要点列举必须用真正的无序列表（- xxx）或有序列表（1. xxx），每条独立成行；严禁用 ①②③④ 这种行内符号代替列表
   - 关键概念、易错点、得分要点、关键词用 **加粗** 标注
   - 重要小节或并列板块用三级标题 ### xxx 切分，前后空行
   - 对比类内容（易混项、动词变化分类、修辞手法对比、文言词类活用等）必须用 Markdown 表格（| ... | ... |）呈现，含表头
   - 每 2-3 句连续叙述后必须空一行分段，避免出现超过 5 行的长段落"""
        core_definition_formula = "- 给出该知识点的权威定义（**必须用 > 引用块框出**）、核心规则、适用条件、关键例外；\n- 对规则性内容（如语法变化规则、句型结构、修辞要点）用真正的有序/无序列表逐条呈现，每条独立成行；对比性内容用 Markdown 表格；"
        example_formula = "解题过程要分步书写，关键步骤写出依据（引用教材规则原文），并用有序列表逐条列出；"

    prompt = f"""你是一位拥有 20 年教学经验、深谙中高考命题规律的资深{subject}教师。请为以下教学需求生成一份达到"特级教师公开课"水准的备课内容：

教学目标：{goal}
难度等级：{difficulty}{student_info}{weak_points_info}{mode_info}{duration_info}{requirements_info}

【输出要求】
1. 严格按下面五个小节顺序输出，每节使用 "## " 二级标题开头，不得增删小节、不得改标题文字。
{formula_requirement}
3. 内容必须紧扣"{goal}"，做到"定义精准、剖析到位、易错点真实可考、提分技巧可落地、例题推导完整"。
4. 每个小节字数不少于 300 字，整篇不少于 1800 字。

## 教材核心原文
本节给出该知识点的权威定义，要求：
- 严格参照人教版最新教材原文，逐字给出核心定义、定理、定律的完整表述；
{core_definition_formula}
- 不得口语化，不得偷换概念，做到与教材完全一致。

## 教学深度剖析
本节面向教师讲解"为什么这样教、学生难点在哪"，要求：
- 拆解知识点的核心模型/思维框架，说明模型建立的思维过程；
- 至少给出 2 个生活化或跨学科类比，帮助学生建立直觉；
- 指出本节内容在学科知识体系中的地位（前置、后续、关联章节）；
- 点明学生理解该知识点的认知障碍与突破路径；
- 渗透学科思想方法（如对比分析、系统论、模型化、数形结合等）。

## 易错点拨
本节针对学生真实高频错误，要求：
- 列出至少 4 个典型易错点，每个易错点须包含"错误表现 + 错因分析 + 纠正策略"三段式；
- 错误表现要具体到学生常见的具体错误（算式、单位、符号、方向、用词、句式等）；
- 重点提醒适用条件、边界情况、易混淆细节；
- 对易混淆概念进行对比辨析（可用表格或并列清单）。

## 提分技巧
本节给出可记忆、可复用的解题套路，要求：
- 提炼 3-5 条解题套路/二级结论，每条须说明"适用题型 + 使用步骤 + 注意事项"；
- 给出 1-2 个便于学生记忆的口诀或顺口溜（押韵、简短、好记）；
- 总结本类问题在考试中的高频考法与得分要点；
- 二级结论需标注"可直接使用"或"需推导后使用"，避免学生误用。

## 经典例题推导
本节通过完整例题演示解题过程，要求：
- 精选 2 道典型例题：1 道基础巩固题 + 1 道中高考真题或模拟题；
- 每道例题包含"题目 + 审题分析 + 解题过程 + 答案 + 方法提炼"五部分；
- 解题过程要分步书写，{example_formula}
- 至少 1 道题给出多种解法（如整体法/隔离法、解析法/图象法）并比较优劣；
- 末尾给出 1-2 道变式练习题（仅给题目，不给答案），用于课堂延伸。"""

    try:
        response = Generation.call(
            model="qwen-plus",
            prompt=prompt,
            max_tokens=8192
        )

        if response.status_code != 200:
            raise Exception(f"API调用失败: {response.message}")

        return parse_response(response.output.text)
    except Exception as e:
        raise Exception(f"生成失败: {str(e)}")

def parse_response(text: str) -> dict:
    """解析五段式输出，按 ## 二级标题切分"""
    sections = {
        "coreDefinition": "",
        "teachingAnalysis": "",
        "mistakeWarnings": "",
        "scoreBoosting": "",
        "exampleDerivation": ""
    }

    # 字段名映射：标题关键词 -> 字段名
    section_map = [
        ("教材核心原文", "coreDefinition"),
        ("教学深度剖析", "teachingAnalysis"),
        ("易错点拨", "mistakeWarnings"),
        ("提分技巧", "scoreBoosting"),
        ("经典例题推导", "exampleDerivation"),
    ]

    current_section = None
    lines = text.split('\n')

    for line in lines:
        # 仅匹配二级标题 "## xxx"
        if line.lstrip().startswith('## '):
            title = line.lstrip()[3:].strip()
            matched = False
            for keyword, field in section_map:
                if keyword in title:
                    current_section = field
                    matched = True
                    break
            if not matched:
                current_section = None
        elif current_section:
            sections[current_section] += line + '\n'

    # 去除每个 section 首尾空白
    for key in sections:
        sections[key] = sections[key].strip()

    # 如果解析失败（全部为空），把原文塞进第一节，避免后端拿到空数据
    if not any(sections.values()):
        return {
            "coreDefinition": text,
            "teachingAnalysis": "",
            "mistakeWarnings": "",
            "scoreBoosting": "",
            "exampleDerivation": ""
        }

    return sections
