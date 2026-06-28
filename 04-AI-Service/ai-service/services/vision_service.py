import os
import tempfile
import base64
import uuid
import dashscope
from dashscope import MultiModalConversation
from config import DASHSCOPE_API_KEY

dashscope.api_key = DASHSCOPE_API_KEY

def analyze_homework(images_base64_list: list[str]) -> dict:
    """
    Analyzes a list of base64 encoded images of student homework.
    Returns structured markdown containing wrong questions, analysis, and knowledge points.
    """
    temp_files = []
    messages = []
    
    # Write base64 to temp files so dashscope can read them via file://
    content_list = []
    try:
        for idx, img_b64 in enumerate(images_base64_list):
            # remove data:image/jpeg;base64, prefix if present
            if "," in img_b64:
                img_b64 = img_b64.split(",", 1)[1]
            
            img_data = base64.b64decode(img_b64)
            temp_file_path = os.path.join(tempfile.gettempdir(), f"hw_img_{uuid.uuid4().hex[:8]}.jpg")
            with open(temp_file_path, "wb") as f:
                f.write(img_data)
            temp_files.append(temp_file_path)
            
            # format for windows local file uri
            file_uri = f"file://{temp_file_path.replace(chr(92), '/')}" 
            content_list.append({"image": file_uri})
        
        prompt_text = """你是一个专业的全科特级教师。请仔细分析这些学生作业图片，并提取和分析错题。
请严格按以下格式输出，以方便系统解析呈现。

重要规则：
1. 【重要】本功能为错题分析，只提取和分析作业中做错的题，绝对不要将做对的题放入报告中！任何学生做对的题（如“无错误”、“正确”）请完全忽略，不要在任何章节中提及。
2. 【重要】禁止在章节内容中输出任何 Markdown 标题符号（如 #、##、### 等），也不要输出单独的 *、-、+ 等列表符号，或者 --- 等分割线。
3. 【重要】所有需要强调的内容（例如：错误点、正确答案、解题公式、步骤标题）统一使用双星号黑色加粗，格式为 **加粗文本**。加粗请使用成对的双星号，中间不要出现单独的星号。
4. 【重要】对于每道错题，都必须给出完整的详细解题步骤，每一步单独占一行。所有数学算式、分式和方程步骤，请直接使用标准文本字符表示（例如分数用 1/4，乘法用 ×，除法用 ÷，不要使用 LaTeX 公式，不要使用箭头符号如 ->）。排版使用中文序号（如 1. 2. 3. 或 第一、第二），禁止使用列表符号。

请按以下结构输出：

## 错题回顾
[仅列出做错的题目内容，简明扼要，不要放任何做对的题目]

## 错误原因分析
[针对每道错题，详细讲解为什么做错，学生的错误思路是什么。给出完整详细的正确解题步骤，每一步单独一行]

## 核心知识点详解
[详细讲解这些错题涉及到的核心知识点和公式原理，帮助学生弄懂原理，不能留空，用通俗易懂的语言详细讲解]

## 巩固建议
[给出后续复习或练习的建议]
"""
        content_list.append({"text": prompt_text})
        messages.append({"role": "user", "content": content_list})

        system_message = {
            "role": "system",
            "content": [
                {
                    "text": "你是一个严格遵守输出格式要求的教学助手。只分析做错的题，忽略所有做对的题。输出时只允许使用 ## 错题回顾、## 错误原因分析、## 核心知识点详解、## 巩固建议 这四个分区标题。除此之外，内容中禁止出现任何 Markdown 标题符号（如 #、###）、列表符号（如 *、-、+）。分区内必须使用纯文本和中文序号排版。重点内容用 **文本** 加粗。"
                }
            ]
        }

        response = MultiModalConversation.call(
            model="qwen-vl-plus",
            messages=[system_message, messages[0]]
        )
        
        if response.status_code != 200:
            raise Exception(f"API调用失败: {response.message}")
            
        result_text = ""
        # parse text from multimodal response
        choices = response.output.get("choices", [])
        if choices:
            content = choices[0].get("message", {}).get("content", [])
            for c in content:
                if "text" in c:
                    result_text += c["text"]
                    
        return parse_vision_response(result_text)
        
    except Exception as e:
        raise Exception(f"分析失败: {str(e)}")
    finally:
        # Cleanup temporary files
        for fpath in temp_files:
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except:
                    pass

def parse_vision_response(text: str) -> dict:
    sections = {
        "wrongQuestions": "",
        "errorAnalysis": "",
        "knowledgePoints": "",
        "suggestions": ""
    }

    current_section = None
    lines = text.split('\n')

    def is_header(line: str, keywords: list[str]) -> bool:
        line_clean = line.replace('#', '').replace(':', '').replace('：', '').strip()
        if len(line_clean) > 25:
            return False
        return any(kw in line_clean for kw in keywords)

    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            if current_section:
                sections[current_section] += line + '\n'
            continue

        # Check if this line is a section header
        if line_strip.startswith('#') or ('回顾' in line_strip or '分析' in line_strip or '详析' in line_strip or '详解' in line_strip or '建议' in line_strip):
            if is_header(line_strip, ['错题回顾', '题目回顾', '回顾']):
                current_section = 'wrongQuestions'
                continue
            elif is_header(line_strip, ['错误原因', '原因分析', '深度剖析', '剖析']):
                current_section = 'errorAnalysis'
                continue
            elif is_header(line_strip, ['知识点', '知点', '详解', '详析']):
                current_section = 'knowledgePoints'
                continue
            elif is_header(line_strip, ['巩固建议', '建议', '巩固', '练习']):
                current_section = 'suggestions'
                continue

        if current_section:
            sections[current_section] += line + '\n'

    # Clean up empty lines and strip any trailing/leading whitespaces
    for key in sections:
        sections[key] = sections[key].strip()

    # If parsing failed completely, fallback
    if not any(sections.values()):
        return {
            "wrongQuestions": text,
            "errorAnalysis": "见上文",
            "knowledgePoints": "见上文",
            "suggestions": "无"
        }

    return sections
