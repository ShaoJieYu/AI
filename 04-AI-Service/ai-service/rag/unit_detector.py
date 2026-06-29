"""
教材 Unit 边界检测器。

支持两种教材的章节检测：
1. 人教版英语教材（UNIT 标识）：
   - 起始页含 "UNIT\\n" 标记（位于标题之后，因 PDF 阅读顺序）
   - 后续每页底部有 "UNIT N" 页脚标识（如 "UNIT 6"）
   - 起始页有 "BIG Question" 三要素

2. 人教版物理教材（第 N 章 标识）：
   - 每页页眉有"第 N 章 XXX"格式（N 为中文数字，如"第五章 抛体运动"）
   - 章号是中文数字（五/六/七/八），需转阿拉伯数字
   - 目录页包含多个章号，需跳过避免污染

本模块扫描按页提取的文本，识别每个 Unit/章 的起止页范围和标题，
用于给 chunk 元数据补全 unit / unit_title 字段，提升检索精度。

用法：
    from rag.unit_detector import detect_units
    # 英语教材
    unit_map = detect_units(pages, subject="英语")
    # 物理教材
    unit_map = detect_units(pages, subject="物理")
    # unit_map[page_number] = {"unit": 6, "unit_title": "Rain or Shine"}
"""
import re
from typing import List, Dict, Optional


# ============================================================
# 英语教材的 Unit 检测（UNIT + BIG Question）
# ============================================================

# 匹配 "UNIT 6" / "UNIT6" / "Unit 6" 页脚标识（UNIT 后紧跟数字，用于确定 Unit 编号）
_UNIT_FOOTER_RE = re.compile(r"\bUNIT\s*(\d+)\b", re.IGNORECASE)

# 匹配 Unit 起始页（必须同时有 BIG + Question + UNIT 独占一行三个特征）
# 单独的 _UNIT_START_RE 只用于辅助，真正判定用 _is_unit_start_page
_UNIT_START_RE = re.compile(r"(?<!\w)UNIT\s*\n(?!.*\d)", re.IGNORECASE)

# 起始页完整特征：BIG + Question + UNIT 三要素
_UNIT_START_FULL_RE = re.compile(
    r"BIG\s*\n\s*Question", re.IGNORECASE
)


# ============================================================
# 物理教材的章节检测（第 N 章，N 为中文数字）
# ============================================================

# 匹配"第 N 章 XXX"格式，N 为中文数字（一到十）
# 支持空格可选，章号后面跟章标题（可能含空格）
# 例：第五章 抛体运动 / 第六章 圆周运动
_CHAPTER_RE = re.compile(r"第\s*([一二三四五六七八九十])\s*章\s*([^\n]{2,30})")

# 中文数字到阿拉伯数字的映射
_CN_NUM_MAP = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
}


def _cn_to_int(cn: str) -> Optional[int]:
    """中文数字转阿拉伯数字（一到十）"""
    return _CN_NUM_MAP.get(cn)


def _extract_chapter_from_page(text: str) -> Optional[tuple]:
    """
    从物理教材某一页的文本中提取章节信息。

    返回：(unit_num, unit_title) 或 None
    如果一页匹配到多个不同章号（目录页），返回 None（避免目录污染）

    注意：本函数只做单页提取，不做"是否为正文引用"判断。
    误匹配（如正文里引用"第一章"）由 detect_units_physics 的频次过滤处理。
    """
    matches = _CHAPTER_RE.findall(text)
    if not matches:
        return None

    # 去重：同一页可能多次匹配到同一章号（页眉 + 正文）
    seen = set()
    unique = []
    for cn_num, title in matches:
        num = _cn_to_int(cn_num)
        if num is None:
            continue
        if num not in seen:
            seen.add(num)
            unique.append((num, title.strip()))

    # 如果一页匹配到多个不同章号，说明是目录页，跳过
    if len(unique) > 1:
        return None

    if len(unique) == 1:
        num, title = unique[0]
        # 清理标题：去掉可能混入的页码或多余空格
        title = re.sub(r"\s+", " ", title).strip()
        # 去掉标题末尾的数字（页码污染，如"机械能守恒定律101"）
        title = re.sub(r"\d+$", "", title).strip()
        # 截断过长的标题（防止匹配到正文里的"第 N 章"引用）
        if len(title) > 20:
            title = title[:20]
        return (num, title)

    return None


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


def detect_units_physics(pages: List[Dict]) -> Dict[int, Dict]:
    """
    物理教材章节检测：扫描每页页眉的"第 N 章 XXX"标记。

    物理教材（人教版必修第二册）的章节标记规律：
    - 奇数页页眉是章标题"第五章 抛体运动"
    - 偶数页页眉是书名"高中物理必修第二册"（无章节标记）
    - 目录页（第 3 页）包含多个章号，需跳过
    - 正文里可能引用其他章节（如"我们曾在第四章中..."），需过滤

    检测策略（三步走）：
    1. 找锚点：遍历每一页，用 _extract_chapter_from_page 提取章节信息
    2. 频次过滤：统计每个章号出现次数，出现 >= 2 次的章号是有效章节
       （误匹配如正文引用"第一章"通常只出现 1 次，会被过滤）
    3. 范围扫描：每个锚点往后扫描直到下一个锚点-1，
       给中间无标记的页面（偶数页）填充当前章节信息

    Args:
        pages: extract_pdf 返回的 [{"page": 1, "text": "..."}]

    Returns:
        {page_number: {"unit": N, "unit_title": "标题"}}
        未识别章节的页（封面/目录等）不会出现在结果中
    """
    from collections import Counter

    # 第 1 步：找所有章节锚点
    anchors = []  # [(page_num, unit_num, unit_title)]
    for p in pages:
        result = _extract_chapter_from_page(p["text"])
        if result:
            num, title = result
            anchors.append((p["page"], num, title))

    # 第 2 步：频次过滤——只保留出现 >= 2 次的章号
    num_counts = Counter(num for _, num, _ in anchors)
    valid_nums = {num for num, cnt in num_counts.items() if cnt >= 2}
    filtered_anchors = [(p, n, t) for p, n, t in anchors if n in valid_nums]

    # 调试信息：打印被过滤的误匹配
    filtered_out = [(p, n, t) for p, n, t in anchors if n not in valid_nums]
    if filtered_out:
        print(f"[unit_detector] 过滤误匹配 {len(filtered_out)} 页:")
        for p, n, t in filtered_out:
            print(f"  第{p}页: 第{n}章 {t}（出现 {num_counts[n]} 次，疑正文引用）")

    # 第 3 步：范围扫描——每个锚点往后覆盖到下一个锚点-1
    # 注意：第一个锚点之前的页面（封面/目录）不归属任何章节
    filtered_anchors.sort(key=lambda x: x[0])
    unit_map = {}
    max_page = max(p["page"] for p in pages) if pages else 0

    # 按章号分组，同一章的连续锚点合并为一个范围
    # 第一个锚点确定起始页，遇到不同章号的锚点时结束当前章
    if not filtered_anchors:
        return unit_map

    # 构建章节范围：每个锚点覆盖到"下一个不同章号的锚点"-1
    # 同一章的多个锚点（奇数页）会自然合并
    chapter_ranges = []  # [(start_page, end_page, num, title)]
    current_num = filtered_anchors[0][1]
    current_title = filtered_anchors[0][2]
    range_start = filtered_anchors[0][0]

    for i in range(1, len(filtered_anchors)):
        page, num, title = filtered_anchors[i]
        if num != current_num:
            # 遇到新章节，结束当前章
            chapter_ranges.append((range_start, page - 1, current_num, current_title))
            current_num = num
            current_title = title
            range_start = page
        # 同章的后续锚点，更新标题（可能更完整）但不改变范围起点

    # 最后一个章节范围
    chapter_ranges.append((range_start, max_page, current_num, current_title))

    # 填充 unit_map
    for start, end, num, title in chapter_ranges:
        for page_num in range(start, end + 1):
            unit_map[page_num] = {"unit": num, "unit_title": title}

    return unit_map


def detect_units(pages: List[Dict], book: str = "", subject: str = "") -> Dict[int, Dict]:
    """
    扫描按页提取的文本，识别每个 Unit/章 的起止范围。

    根据 subject 参数选择不同检测策略：
    - subject="英语"：用 BIG Question + UNIT 标记检测（人教版英语教材）
    - subject="物理"：用"第 N 章"页眉标记检测（人教版物理教材）
    - 其他/空：默认用英语策略，失败时用 fallback

    Args:
        pages: extract_pdf 返回的 [{"page": 1, "text": "..."}]
        book: 教材名（用于判断是否使用 fallback）
        subject: 学科（中文），决定使用哪种检测策略

    Returns:
        {page_number: {"unit": N, "unit_title": "标题"}}
        未识别 Unit 的页不会出现在结果中
    """
    # 按学科路由
    if subject == "物理":
        return detect_units_physics(pages)

    # 英语教材检测策略（默认）
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
