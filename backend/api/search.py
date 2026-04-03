from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from database import get_db
from rag.pipeline import query as rag_query
from config import settings

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    language: str = "mt"  # mt = Maltese (default), en = English
    filters: dict = {}


async def check_rate_limit(request: Request):
    redis = request.app.state.redis
    ip = request.client.host
    key = f"lexmalta:ratelimit:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 86400)
    if count > settings.rate_limit_anonymous:
        raise HTTPException(
            status_code=429,
            detail="Aqbeż il-limitu ta' mistoqsijiet. Erġa' pprova għada." if True else
                   "Daily query limit reached. Try again tomorrow.",
        )


@router.post("/")
async def search(
    req: SearchRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await check_rate_limit(request)
    redis = request.app.state.redis
    result = await rag_query(
        user_query=req.query,
        db=db,
        redis=redis,
        filters=req.filters,
        language=req.language,
    )
    return result
