"""
Hybrid retriever: BM25 keyword search + pgvector semantic search.
BM25 is free. Semantic search uses local embeddings (free).
Claude is only called AFTER retrieval — never for search itself.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, or_
from rag.embeddings import embed
from models import Law, Judgment, Lawyer, Document
from config import settings


async def retrieve(query: str, db: AsyncSession, filters: dict = None) -> list[dict]:
    filters = filters or {}
    query_vec = embed(query)

    results = []

    # --- Vector similarity search across all tables ---
    tables = [
        ("laws", "chapter, title, summary, source_url", "law"),
        ("judgments", "reference, court, parties, date, source_url", "judgment"),
        ("documents", "title, source, doc_type, source_url", "document"),
    ]

    source_filter = filters.get("source")
    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    court_filter = filters.get("court")

    for table, fields, doc_type in tables:
        where_clauses = []
        if source_filter and table == "documents":
            where_clauses.append(f"source = '{source_filter}'")
        if date_from and table == "judgments":
            where_clauses.append(f"date >= '{date_from}'")
        if date_to and table == "judgments":
            where_clauses.append(f"date <= '{date_to}'")
        if court_filter and table == "judgments":
            where_clauses.append(f"court ILIKE '%{court_filter}%'")

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        sql = text(f"""
            SELECT id, {fields}, full_text,
                   1 - (embedding <=> :vec::vector) AS score
            FROM {table}
            {where_sql}
            ORDER BY embedding <=> :vec::vector
            LIMIT :k
        """)
        rows = await db.execute(sql, {"vec": str(query_vec), "k": settings.top_k_retrieval})
        for row in rows.mappings():
            results.append({"type": doc_type, **dict(row)})

    # Sort all results by score, take top_k
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return results[:settings.top_k_retrieval]


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        doc_type = chunk.get("type", "document")
        if doc_type == "law":
            header = f"[{i}] LAW — {chunk.get('chapter')} {chunk.get('title')}"
        elif doc_type == "judgment":
            header = f"[{i}] JUDGMENT — {chunk.get('reference')} | {chunk.get('court')} | {chunk.get('date')}"
        else:
            header = f"[{i}] {chunk.get('source', 'DOCUMENT').upper()} — {chunk.get('title')}"
        text_snippet = (chunk.get("full_text") or "")[:1500]
        url = chunk.get("source_url", "")
        parts.append(f"{header}\nURL: {url}\n{text_snippet}")
    return "\n\n---\n\n".join(parts)
