from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis
from database import init_db
from config import settings
from api import search, lawyers, laws, judgments, draft, alerts, matter, scrape, suggestions, documents, igaming

_redis: aioredis.Redis = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _redis
    await init_db()
    _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    app.state.redis = _redis
    yield
    await _redis.aclose()


app = FastAPI(
    title="Ligi4Friends",
    description="Il-pjattaforma tal-intelliġenza legali Maltija — b'xejn, miftuħa għal kulħadd.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/search", tags=["Tfittxija"])
app.include_router(lawyers.router, prefix="/api/lawyers", tags=["Avukati"])
app.include_router(laws.router, prefix="/api/laws", tags=["Liġijiet"])
app.include_router(judgments.router, prefix="/api/judgments", tags=["Sentenzi"])
app.include_router(draft.router, prefix="/api/draft", tags=["Abbozzar"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Allerts"])
app.include_router(matter.router, prefix="/api/matter", tags=["Matters"])
app.include_router(scrape.router, prefix="/api/scrape", tags=["Admin"])
app.include_router(suggestions.router, prefix="/api/suggestions", tags=["Suggestions"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(igaming.router, prefix="/api/igaming", tags=["iGaming"])


@app.get("/")
async def root():
    return {
        "message": "Ligi4Friends API",
        "description": "Il-liġi Maltija — miftuħa għal kulħadd",
        "docs": "/docs",
    }
