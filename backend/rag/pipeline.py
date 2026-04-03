"""
RAG pipeline — the only place Claude is called.
DEFAULT LANGUAGE: Maltese (mt). English available on toggle.
Routes to Haiku (cheap) or Sonnet (complex) based on query complexity.
Redis caches results so repeated questions cost nothing.
"""
import json
import hashlib
import anthropic
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from rag.retriever import retrieve, build_context
from config import settings

_anthropic = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT_MT = """Inti LexMalta, assistent ta' riċerka legali speċjalizzat fil-liġi Maltija.

Regoli:
- WIEĠEB BIL-MALTI dejjem, sakemm l-utent ma jitlobx bl-Ingliż
- WIEĠEB biss fuq il-bażi tad-dokumenti sors ipprovduti
- ĊITA s-sorsi tiegħek dejjem bl-użu ta' [1], [2] eċċ.
- QATT ma tinventa leġiżlazzjoni, referenzi ta' kawżi, jew numri ta' artikoli
- Jekk it-tweġiba mhix fil-kuntest ipprovdut, għid hekk b'mod ċar
- It-tweġibiet huma għar-riċerka legali biss — mhux parir legali
- Kun preċiż, ċita numri ta' kapitoli, numri ta' artikoli, u referenzi ta' kawżi eżattament"""

SYSTEM_PROMPT_EN = """You are LexMalta, a legal research assistant specialising in Maltese law.

Rules:
- ONLY answer based on the provided source documents
- ALWAYS cite your sources using [1], [2] etc. matching the numbered context
- NEVER invent legislation, case references, or article numbers
- If the answer is not in the provided context, say so clearly
- Responses are for legal research only — not legal advice
- Be precise, cite chapter numbers, article numbers, and case references exactly"""

COMPLEXITY_KEYWORDS = {
    "analyse", "analizza", "compare", "qabbel", "explain", "spjega",
    "difference", "differenza", "relationship", "relazzjoni",
    "conflict", "kunflitt", "interpret", "interpreta",
    "history", "storja", "evolution", "evoluzzjoni",
    "constitutional", "kostituzzjonali", "appeal", "appell",
    "challenge", "sfida", "draft", "abbozza", "advise", "savjet",
}


def _is_complex_query(query: str) -> bool:
    words = set(query.lower().split())
    return bool(words & COMPLEXITY_KEYWORDS) or len(query.split()) > 15


def _cache_key(query: str, filters: dict, lang: str) -> str:
    raw = json.dumps({"q": query.lower().strip(), "f": filters, "l": lang}, sort_keys=True)
    return "lexmalta:query:" + hashlib.sha256(raw.encode()).hexdigest()


async def query(
    user_query: str,
    db: AsyncSession,
    redis: aioredis.Redis,
    filters: dict = None,
    language: str = "mt",  # Maltese by default
) -> dict:
    filters = filters or {}
    cache_key = _cache_key(user_query, filters, language)

    # Cache hit = zero Claude cost
    cached = await redis.get(cache_key)
    if cached:
        result = json.loads(cached)
        result["cached"] = True
        return result

    chunks = await retrieve(user_query, db, filters)
    if not chunks:
        no_results = (
            "Ma nstab l-ebda dokument rilevanti fid-database." if language == "mt"
            else "No relevant documents found in the database."
        )
        return {"answer": no_results, "sources": [], "cached": False}

    context = build_context(chunks)
    model = settings.model_complex if _is_complex_query(user_query) else settings.model_simple
    system = SYSTEM_PROMPT_MT if language == "mt" else SYSTEM_PROMPT_EN

    response = await _anthropic.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[
            {
                "role": "user",
                "content": f"Dokumenti ta' kuntest:\n\n{context}\n\n---\n\nMistoqsija: {user_query}",
            }
        ],
    )

    answer = response.content[0].text
    sources = [
        {
            "type": c.get("type"),
            "title": c.get("title") or c.get("reference") or c.get("chapter"),
            "url": c.get("source_url"),
            "score": round(c.get("score", 0), 3),
        }
        for c in chunks
    ]

    result = {
        "answer": answer,
        "sources": sources,
        "model_used": model,
        "language": language,
        "cached": False,
    }

    await redis.setex(cache_key, settings.cache_ttl_seconds, json.dumps(result))
    return result
