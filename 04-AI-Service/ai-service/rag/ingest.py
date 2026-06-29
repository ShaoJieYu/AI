"""
教材一次性入库脚本。

用法：
    python -m rag.ingest --pdf data/textbooks/english_junior_g7b.pdf \
        --subject 英语 --grade 初一 --book "七年级下册"

流程：
    1. PyMuPDF 提取 PDF 全文（按页）
    2. 切分为 chunk（chunk_size=500, overlap=50）
    3. 通义千问 text-embedding-v2 批量向量化
    4. upsert（含 embeddings）进对应学科的 Chroma collection
    5. 打印统计

注意：
    使用通义千问 text-embedding-v2（中文+英文混合效果好），
    入库和检索必须用同一模型，保证向量空间一致。
"""
import argparse
import os
import sys
import time

# 确保能 import 项目根目录的模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.pdf_extractor import extract_pdf
from rag.text_splitter import split_pages
from rag.embedder import embed_texts
from rag.vector_store import add_chunks_with_embeddings, get_stats
from rag.unit_detector import detect_units


def ingest(pdf_path: str, subject: str, grade: str, book: str,
           chunk_size: int = 500, chunk_overlap: int = 50) -> dict:
    """
    入库主流程。

    Returns:
        {"pages": N, "chunks": M, "subject": ..., "book": ...}
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF 文件不存在: {pdf_path}")

    print(f"[1/5] 提取 PDF: {pdf_path}")
    pages = extract_pdf(pdf_path)
    print(f"      提取到 {len(pages)} 页有效内容")

    print(f"[2/5] 检测 Unit 边界（subject={subject}）")
    unit_map = detect_units(pages, book=book, subject=subject)
    print(f"      识别到 {len(unit_map)} 页归属某个 Unit")
    if unit_map:
        # 按 Unit 分组统计
        units_summary = {}
        for info in unit_map.values():
            key = (info["unit"], info["unit_title"])
            units_summary[key] = units_summary.get(key, 0) + 1
        for (unit_num, title), cnt in sorted(units_summary.items()):
            print(f"      Unit {unit_num} - {title}: {cnt} 页")

    print(f"[3/5] 切分文本 (chunk_size={chunk_size}, overlap={chunk_overlap})")
    metadata = {"subject": subject, "grade": grade, "book": book}
    chunks = split_pages(pages, metadata, chunk_size, chunk_overlap, unit_map=unit_map)
    print(f"      切出 {len(chunks)} 个 chunk")
    # 统计带 Unit 元数据的 chunk 数
    chunks_with_unit = sum(1 for c in chunks if "unit" in c["metadata"])
    print(f"      其中 {chunks_with_unit} 个 chunk 带 Unit 元数据")

    if not chunks:
        print("      警告：没有切出任何 chunk，可能是 PDF 内容为空")
        return {"pages": len(pages), "chunks": 0, "subject": subject, "book": book}

    print(f"[4/5] 通义千问 text-embedding-v2 向量化 (共 {len(chunks)} 条)...")
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    print(f"      生成 {len(embeddings)} 个向量，维度 {len(embeddings[0]) if embeddings else 0}")

    if len(embeddings) != len(chunks):
        raise RuntimeError(
            f"向量化数量不匹配: {len(chunks)} chunks vs {len(embeddings)} embeddings"
        )

    print(f"[5/5] 写入 Chroma (subject={subject})")
    count = add_chunks_with_embeddings(chunks, embeddings, subject)
    print(f"      写入 {count} 条记录")

    stats = get_stats()
    for subj, cnt in stats.items():
        print(f"      {subj}: {cnt} 条")

    return {"pages": len(pages), "chunks": count, "subject": subject, "book": book}


def main():
    parser = argparse.ArgumentParser(description="教材 PDF 入库到 Chroma 向量库（通义千问 embedding）")
    parser.add_argument("--pdf", required=True, help="PDF 文件路径")
    parser.add_argument("--subject", required=True, help="学科（如 英语/物理）")
    parser.add_argument("--grade", required=True, help="年级（如 初一）")
    parser.add_argument("--book", required=True, help="教材名（如 七年级下册）")
    parser.add_argument("--chunk-size", type=int, default=500, help="chunk 字符数")
    parser.add_argument("--chunk-overlap", type=int, default=50, help="chunk 重叠字符数")
    args = parser.parse_args()

    start = time.time()
    result = ingest(
        pdf_path=args.pdf,
        subject=args.subject,
        grade=args.grade,
        book=args.book,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )
    elapsed = time.time() - start
    print(f"\n入库完成！耗时 {elapsed:.1f}s")
    print(f"  教材: {result['book']}（{result['subject']}）")
    print(f"  页数: {result['pages']}")
    print(f"  chunks: {result['chunks']}")


if __name__ == "__main__":
    main()
