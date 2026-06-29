"""
教材 Unit 边界检测器。

人教版英语教材的 Unit 标识规律：
1. 起始页含 "UNIT\\n" 标记（位于标题之后，因 PDF 阅读顺序）
2. 后续每页底部有 "UNIT N" 页脚标识（如 "UNIT 6"）

本模块扫描按页提取的文本，识别每个 Unit 的起止页范围和标题，
用于给 chunk 元数据补全 unit / unit_title 字段，提升检索精度。

用法：
    from rag.unit_detector import detect_units
    unit_map = detect_units(pages)
    # unit_map[page_number] = {"unit": 6, "unit_title": "Rain or Shine"}
"""
import re
from typing import List, Dict, Optional


# 匹配 "UNIT 6" / "UNIT6" / "Unit 6" 页脚标识（UNIT 后紧跟数字，用于确定 Unit 编号）
_UNIT_FOOTER_RE = re.compile(r"\bUNIT\s*(\d+)\b", re.IGNORECASE)

# 匹配 Unit 起始页（必须同时有 BIG + Question + UNIT 独占一行三个特征）
# 单独的 _UNIT_START_RE 只用于辅助，真正判定用 _is_unit_start_page
_UNIT_START_RE = re.compile(r"(?<!\w)UNIT\s*\n(?!.*\d)", re.IGNORECASE)

# 起始页完整特征：BIG + Question + UNIT 三要素
_UNIT_START_FULL_RE = re.compile(
    r"BIG\s*\n\s*Question", re.IGNORECASE
)


def _is_unit_start_page(text: str) -> bool:
    """
    严格判定是否为 Unit 起始页。

    真正的 Unit 起始页必须同时包含：
    1. "BIG" 标识
    2. "Question" 关键词
    3. "UNIT" 独占一行（非 "UNIT N" 页脚）
    """
    if not _UNIT_START_FULL_RE.search(text):
        return False
    if not _UNIT_START_RE.search(text):
        return False
    return True

# 已知 Unit 标题（人教版 2025 春版七年级下册英语，从 PDF 实际提取确认）
# 用作 fallback：如果 PDF 标题提取失败，按页码范围推断 Unit
KNOWN_UNITS_FALLBACK = [
    (1, "Animal Friends", 10, 17),
    (2, "No Rules, No Order", 18, 25),
    (3, "Keep Fit", 26, 33),
    (4, "Eat Well", 34, 41),
    (5, "Here and Now", 42, 49),
    (6, "Rain or Shine", 50, 57),
    (7, "A Day to Remember", 58, 65),
    (8, "Once upon a Time", 66, 73),
]


def _extract_title_from_start_page(text: str) -> Optional[str]:
    """
    从 Unit 起始页文本中提取标题。

    PDF 实际有两种排版：
    类型 A（Unit 1-6, 8）：标题在 UNIT 之前
        BIG
        Question
        How does the weather affect us?  ← Big Question 引导句
        Rain or Shine                   ← Unit 标题
        UNIT
        In this unit, you will ...

    类型 B（Unit 7）：标题在 UNIT 之后
        BIG
        Question
        What makes a day special?
        A Day to                        ← 标题前半
        Remember                        ← 标题后半
        In this unit, you will ...
        ...
        UNIT
        A Day to Remember               ← 完整标题

    策略：
    1. 先找 UNIT 后面到 "In this unit" 之前的文本（类型 B 的标题区）
    2. 如果没有，找 Question 之后到 UNIT 之前的最后一个非问句行（类型 A）
    3. 标题可能跨行，需要合并
    """
    unit_match = _UNIT_START_RE.search(text)
    if not unit_match:
        return None

    after_unit = text[unit_match.end():]

    # 策略 1：判断类型 B（UNIT 后紧跟标题，而非 "In this unit"）
    # 类型 B：UNIT 后第一行不是 "In this unit"，而是标题
    # 类型 A：UNIT 后紧跟 "In this unit, you will"
    after_first_line = after_unit.split("\n")[0].strip() if after_unit else ""
    is_type_b = after_first_line and not after_first_line.lower().startswith("in this unit")

    if is_type_b:
        # 类型 B：UNIT 之后的非空行就是标题（可能跨行）
        lines_after = [ln.strip() for ln in after_unit.split("\n") if ln.strip()]
        title_lines = []
        for ln in lines_after:
            # 遇到 "In this unit" 等引导句就停止（标题结束）
            if ln.lower().startswith(("in this unit", "look and")):
                break
            title_lines.append(ln)
        if title_lines:
            return " ".join(title_lines)

    # 策略 2：找 Question 之后到 UNIT 之前的最后一个非问句行（类型 A）
    before_unit = text[:unit_match.start()]
    q_match = re.search(r"Question\s*\n", before_unit, re.IGNORECASE)
    title_area = before_unit[q_match.end():] if q_match else before_unit

    lines = [ln.strip() for ln in title_area.split("\n") if ln.strip()]
    if not lines:
        return None

    # 从后往前找：跳过问句和编号项
    for ln in reversed(lines):
        if ln.endswith("?"):
            continue
        if len(ln) < 2 or len(ln) > 50:
            continue
        # 跳过编号列表项
        if re.match(r"^\d+\.\s", ln):
            continue
        if ln.lower().startswith(("in this unit", "look and")):
            continue
        return ln

    return lines[0]


def detect_units(pages: List[Dict], book: str = "") -> Dict[int, Dict]:
    """
    扫描按页提取的文本，识别每个 Unit 的起止范围。

    Args:
        pages: extract_pdf 返回的 [{"page": 1, "text": "..."}]
        book: 教材名（用于判断是否使用 fallback）

    Returns:
        {page_number: {"unit": N, "unit_title": "标题"}}
        未识别 Unit 的页不会出现在结果中

    检测策略：
        1. 用严格判定（BIG + Question + UNIT）找 Unit 起始页和标题
        2. 从起始页往后扫描，每页找 "UNIT N" 页脚，N 一致则归同一 Unit
        3. 遇到下一个起始页或 N 变化，结束当前 Unit
        4. 若检测失败，使用 KNOWN_UNITS_FALLBACK 按页码推断
    """
    sorted_pages = sorted(pages, key=lambda p: p["page"])
    page_to_text = {p["page"]: p["text"] for p in sorted_pages}

    # 第 1 步：用严格判定找 Unit 起始页
    start_pages = []  # [(page_num, title)]
    for p in sorted_pages:
        if _is_unit_start_page(p["text"]):
            title = _extract_title_from_start_page(p["text"])
            start_pages.append((p["page"], title or f"Unit"))

    unit_map = {}

    if start_pages:
        # 第 2 步：每个起始页往后扫描，确定 Unit 范围
        for i, (start_page, title) in enumerate(start_pages):
            end_page = start_pages[i + 1][0] - 1 if i + 1 < len(start_pages) else sorted_pages[-1]["page"]

            current_unit_num = None
            for page_num in range(start_page, end_page + 1):
                if page_num not in page_to_text:
                    continue
                text = page_to_text[page_num]

                footer_match = _UNIT_FOOTER_RE.search(text)
                if footer_match:
                    detected_num = int(footer_match.group(1))
                    if current_unit_num is None:
                        current_unit_num = detected_num
                    elif detected_num != current_unit_num:
                        break

                unit_map[page_num] = {
                    "unit": current_unit_num or (i + 1),
                    "unit_title": title,
                }
    else:
        print("[unit_detector] 未检测到 Unit 起始页，使用 fallback 页码范围")
        for unit_num, title, start, end in KNOWN_UNITS_FALLBACK:
            for page_num in range(start, end + 1):
                unit_map[page_num] = {"unit": unit_num, "unit_title": title}

    return unit_map


if __name__ == "__main__":
    # 自测：用 fallback 数据验证
    print("===== fallback 测试 =====")
    mock_pages = [{"page": p, "text": ""} for p in range(1, 130)]
    unit_map = detect_units(mock_pages)
    for page in [10, 17, 18, 50, 57, 58, 79]:
        if page in unit_map:
            print(f"第{page}页: {unit_map[page]}")
        else:
            print(f"第{page}页: 未归属任何 Unit")
