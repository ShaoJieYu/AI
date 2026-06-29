"""
文本切分模块。

自写简易递归字符切分器，不依赖 langchain。
策略：按 ["\n\n", "\n", "。", ".", " "] 顺序尝试切分，
尽量在自然段落/句子边界切，避免切碎句子。
"""
from typing import List, Dict, Optional


def split_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    separators: Optional[List[str]] = None,
) -> List[str]:
    """
    将长文本切分为多个 chunk。

    Args:
        text: 原始文本
        chunk_size: 每个 chunk 的最大字符数
        chunk_overlap: 相邻 chunk 之间的重叠字符数（保证上下文连续性）
        separators: 切分分隔符优先级，默认 ["\\n\\n", "\\n", "。", ".", " "]

    Returns:
        chunk 字符串列表
    """
    if separators is None:
        separators = ["\n\n", "\n", "。", ".", " "]

    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    # 用第一个能切出 <= chunk_size 片段的分隔符来切
    for sep in separators:
        if sep == "":
            continue
        if sep in text:
            pieces = text.split(sep)
            chunks = _merge_pieces(pieces, sep, chunk_size, chunk_overlap)
            if chunks:
                return chunks

    # 所有分隔符都切不动（罕见：超长无标点串），硬切
    return _hard_split(text, chunk_size, chunk_overlap)


def _merge_pieces(
    pieces: List[str], sep: str, chunk_size: int, chunk_overlap: int
) -> List[str]:
    """把切出来的片段贪心合并成不超过 chunk_size 的 chunk。"""
    chunks = []
    current = ""
    for piece in pieces:
        candidate = (current + sep + piece) if current else piece
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            # 处理 overlap：取 current 末尾 chunk_overlap 字符作为下一段开头
            if chunk_overlap > 0 and len(current) > chunk_overlap:
                current = current[-chunk_overlap:] + sep + piece
            else:
                current = piece
            # 如果单个 piece 就超长，递归硬切
            if len(current) > chunk_size:
                sub = _hard_split(current, chunk_size, chunk_overlap)
                chunks.extend(sub[:-1])
                current = sub[-1] if sub else ""
    if current.strip():
        chunks.append(current)
    return chunks


def _hard_split(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """无分隔符时的硬切分。"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - chunk_overlap if chunk_overlap > 0 else end
    return [c for c in chunks if c.strip()]


def split_pages(
    pages: List[Dict],
    metadata: Dict,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> List[Dict]:
    """
    对按页提取的文本做切分，每个 chunk 带 metadata。

    Args:
        pages: extract_pdf 返回的 [{"page": 1, "text": "..."}]
        metadata: 全局元数据，如 {"subject": "英语", "grade": "初一", "book": "七年级下册"}
        chunk_size: chunk 最大字符数
        chunk_overlap: 重叠字符数

    Returns:
        [{"id": "...", "text": "...", "metadata": {...}}, ...]
        metadata 包含 subject/grade/book/page/chunk_idx
    """
    all_chunks = []
    chunk_idx = 0
    for page in pages:
        page_chunks = split_text(page["text"], chunk_size, chunk_overlap)
        for text in page_chunks:
            if not text.strip():
                continue
            chunk_meta = {
                **metadata,
                "page": page["page"],
                "chunk_idx": chunk_idx,
            }
            all_chunks.append(
                {
                    "id": f"{metadata.get('book', 'unknown')}_p{page['page']}_c{chunk_idx}",
                    "text": text,
                    "metadata": chunk_meta,
                }
            )
            chunk_idx += 1
    return all_chunks


if __name__ == "__main__":
    sample = "This is sentence one. This is sentence two. " * 20
    chunks = split_text(sample, chunk_size=100, chunk_overlap=20)
    print(f"切出 {len(chunks)} 个 chunk")
    for i, c in enumerate(chunks[:3]):
        print(f"\n--- chunk {i} (len={len(c)}) ---")
        print(c[:120])
