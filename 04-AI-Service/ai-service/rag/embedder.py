"""
通义千问 text-embedding-v2 封装。

文档：https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-synchronous-api
- 模型：text-embedding-v2
- 输入：单次最多 25 条文本，单条最长 2048 tokens
- 输出：每条文本一个 1536 维向量
"""
import os
from typing import List

import dashscope
from config import DASHSCOPE_API_KEY

# 单次 API 调用最大条数（text-embedding-v2 限制）
BATCH_SIZE = 25
EMBEDDING_MODEL = "text-embedding-v2"
EMBEDDING_DIM = 1536


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    批量向量化文本。

    Args:
        texts: 文本列表

    Returns:
        与 texts 等长的向量列表，每条是 1536 维 float 列表

    Raises:
        RuntimeError: API 调用失败时抛出
    """
    if not texts:
        return []

    dashscope.api_key = DASHSCOPE_API_KEY
    all_embeddings: List[List[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        resp = dashscope.TextEmbedding.call(model=EMBEDDING_MODEL, input=batch)

        if resp.status_code != 200:
            raise RuntimeError(
                f"Embedding API 调用失败: status={resp.status_code}, "
                f"code={resp.code}, message={resp.message}"
            )

        # resp.output.embeddings 是 [{"text_index": 0, "embedding": [...]}, ...]
        for item in resp.output["embeddings"]:
            all_embeddings.append(item["embedding"])

    return all_embeddings


def embed_query(query: str) -> List[float]:
    """单条查询向量化（用于检索时把 query 转向量）。"""
    result = embed_texts([query])
    return result[0] if result else []


if __name__ == "__main__":
    # 自测：需要 .env 里配置 DASHSCOPE_API_KEY
    test_texts = ["一般过去时", "现在完成时"]
    vecs = embed_texts(test_texts)
    print(f"生成 {len(vecs)} 个向量，维度 {len(vecs[0]) if vecs else 0}")
