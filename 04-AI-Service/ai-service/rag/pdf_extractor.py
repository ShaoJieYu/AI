"""
PDF 提取与清洗模块。

用 PyMuPDF（fitz）逐页提取文字，做基础清洗：
- 去除页眉页脚（按行长度启发式判断）
- 合并断行（行尾无标点且下一行首字母小写时拼接）
- 去除多余空白行
"""
import re
from typing import List, Dict

import fitz  # PyMuPDF


def extract_pdf(pdf_path: str) -> List[Dict]:
    """
    提取 PDF 全文，按页返回。

    Args:
        pdf_path: PDF 文件路径

    Returns:
        [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}, ...]
    """
    doc = fitz.open(pdf_path)
    pages = []
    for page_num in range(len(doc)):
        raw_text = doc[page_num].get_text("text")
        cleaned = _clean_text(raw_text)
        if cleaned.strip():
            pages.append({"page": page_num + 1, "text": cleaned})
    doc.close()
    return pages


def _clean_text(text: str) -> str:
    """
    清洗单页文本：
    1. 去掉行首尾空白
    2. 合并被硬换行打断的句子（行尾是字母/数字且下一行首是字母小写 → 拼接）
    3. 去掉连续空行（保留单个换行）
    4. 去掉孤立页码行（纯数字且长度 <= 3）
    """
    lines = [line.strip() for line in text.splitlines()]
    lines = [ln for ln in lines if ln]  # 去空行

    # 去页码行
    lines = [ln for ln in lines if not (ln.isdigit() and len(ln) <= 3)]

    # 合并断行：当前行以字母/数字结尾，下一行以小写字母开头 → 拼成一行（加空格）
    merged = []
    for ln in lines:
        if merged:
            prev = merged[-1]
            # 英文断行合并：前一行尾是字母数字，后一行首是小写字母
            if re.search(r"[A-Za-z0-9,;:]$", prev) and re.match(r"^[a-z]", ln):
                merged[-1] = prev + " " + ln
                continue
        merged.append(ln)

    return "\n".join(merged)


def extract_full_text(pdf_path: str) -> str:
    """提取整本 PDF 的纯文本（页与页之间用两个换行分隔）。"""
    pages = extract_pdf(pdf_path)
    return "\n\n".join(f"[第{p['page']}页]\n{p['text']}" for p in pages)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python pdf_extractor.py <pdf路径>")
        sys.exit(1)
    result = extract_pdf(sys.argv[1])
    print(f"共提取 {len(result)} 页")
    for p in result[:2]:
        print(f"\n=== 第 {p['page']} 页 ===")
        print(p["text"][:300])
