"""
Chroma 向量数据库封装。

- 持久化存储到 data/chroma_db/
- collection 按学科隔离：textbook_英语 / textbook_物理 ...
- 使用通义千问 text-embedding-v2 做向量化（入库和检索一致）
- 提供两个核心方法：
    add_chunks_with_embeddings(chunks, embeddings, subject) —— 入库
    search(query, subject, top_k) —— 检索（search_textbook 工具调用）
"""
import os
from typing import List, Dict, Optional

import chromadb

from rag.embedder import embed_query

# Chroma 持久化目录（相对 AI 服务根目录）
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.path.join(BASE_DIR, "data", "chroma_db")


def _collection_name(subject: str) -> str:
    """学科转 collection 名（Chroma collection 名要求 ASCII，用拼音/英文）。"""
    mapping = {
        "英语": "textbook_english",
        "物理": "textbook_physics",
        "化学": "textbook_chemistry",
        "生物": "textbook_biology",
        "数学": "textbook_math",
        "语文": "textbook_chinese",
    }
    return mapping.get(subject, f"textbook_{subject}")


def _get_client():
    """获取 Chroma 持久化客户端。"""
    return chromadb.PersistentClient(path=CHROMA_PATH)


def _delete_collection(subject: str):
    """删除指定学科的 collection（用于重新入库）。"""
    client = _get_client()
    name = _collection_name(subject)
    try:
        client.delete_collection(name)
    except Exception:
        pass


def add_chunks_with_embeddings(
    chunks: List[Dict], embeddings: List[List[float]], subject: str
) -> int:
    """
    用预计算的向量批量写入 Chroma。

    Args:
        chunks: [{"id": "...", "text": "...", "metadata": {...}}, ...]
        embeddings: 与 chunks 一一对应的向量列表
        subject: 学科（中文）

    Returns:
        写入条数
    """
    if not chunks or not embeddings:
        return 0
    if len(chunks) != len(embeddings):
        raise ValueError(f"chunks({len(chunks)}) 与 embeddings({len(embeddings)}) 数量不一致")

    # 先删旧 collection，确保向量空间全新
    _delete_collection(subject)

    client = _get_client()
    col = client.get_or_create_collection(
        name=_collection_name(subject),
        metadata={"hnsw:space": "cosine"},
    )

    ids = [c["id"] for c in chunks]
    texts = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    BATCH = 50  # 向量数据大，批次减小
    total = 0
    for i in range(0, len(ids), BATCH):
        col.upsert(
            ids=ids[i:i+BATCH],
            embeddings=embeddings[i:i+BATCH],
            documents=texts[i:i+BATCH],
            metadatas=metadatas[i:i+BATCH],
        )
        total += min(BATCH, len(ids) - i)
    return total


def search(
    query: str,
    subject: str,
    top_k: int = 5,
) -> List[Dict]:
    """
    在指定学科 collection 中检索与 query 最相关的 chunk。

    使用通义千问 text-embedding-v2 对 query 向量化（与入库时一致）。

    Args:
        query: 查询文本（如"一般过去时"）
        subject: 学科
        top_k: 返回前 k 条

    Returns:
        [{"text": "...", "metadata": {...}, "score": 0.87}, ...]
    """
    client = _get_client()
    try:
        col = client.get_collection(name=_collection_name(subject))
    except Exception:
        return []

    if col.count() == 0:
        return []

    # 通义千问向量化 query
    query_vec = embed_query(query)
    if not query_vec:
        return []

    results = col.query(
        query_embeddings=[query_vec],
        n_results=min(top_k, col.count()),
        include=["documents", "metadatas", "distances"],
    )

    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    output = []
    for text, meta, dist in zip(docs, metas, dists):
        score = 1 - dist
        output.append({"text": text, "metadata": meta, "score": round(score, 4)})
    return output


def search_as_text(query: str, subject: str, top_k: int = 5) -> str:
    """
    检索并把结果格式化成字符串（供 search_textbook 工具直接返回给大模型）。
    """
    results = search(query, subject, top_k)
    if not results:
        return (
            f"【教材检索结果：{subject} - {query}】\n"
            f"未检索到相关教材内容。可能原因：该学科教材尚未入库，"
            f"或检索关键词与教材内容匹配度不足。"
        )

    lines = [f"【教材检索结果：{subject} - {query}】共找到 {len(results)} 条相关片段\n"]
    for i, r in enumerate(results, 1):
        meta = r["metadata"]
        book = meta.get("book", "未知教材")
        page = meta.get("page", "?")
        lines.append(f"[片段 {i}] 相似度 {r['score']} | {book} 第 {page} 页")
        lines.append(f"原文：{r['text']}")
        lines.append("")
    return "\n".join(lines).strip()


def get_stats(subject: Optional[str] = None) -> Dict:
    """统计各学科入库条数。"""
    client = _get_client()
    stats = {}
    subjects = [subject] if subject else ["英语", "物理", "化学", "生物", "数学", "语文"]
    for subj in subjects:
        name = _collection_name(subj)
        try:
            col = client.get_collection(name=name)
            stats[subj] = col.count()
        except Exception:
            stats[subj] = 0
    return stats


if __name__ == "__main__":
    print("Chroma 路径:", CHROMA_PATH)
    print("入库统计:", get_stats())