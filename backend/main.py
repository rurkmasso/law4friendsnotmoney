from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

_redis = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _redis
    # Try to init database — skip if not available (e.g., Render free tier without DB)
    try:
        from database import init_db
        await init_db()
    except Exception as e:
        print(f"[WARNING] Database not available: {e}")

    # Try to init Redis — skip if not available
    try:
        import redis.asyncio as aioredis
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        await _redis.ping()
        app.state.redis = _redis
    except Exception as e:
        print(f"[WARNING] Redis not available: {e}")
        app.state.redis = None

    yield

    if _redis:
        try:
            await _redis.aclose()
        except:
            pass


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

# Import routers — skip any that fail due to missing deps
try:
    from api import search
    app.include_router(search.router, prefix="/api/search", tags=["Search"])
except Exception as e:
    print(f"[WARNING] search router failed: {e}")

try:
    from api import lawyers
    app.include_router(lawyers.router, prefix="/api/lawyers", tags=["Lawyers"])
except Exception as e:
    print(f"[WARNING] lawyers router failed: {e}")

try:
    from api import laws
    app.include_router(laws.router, prefix="/api/laws", tags=["Laws"])
except Exception as e:
    print(f"[WARNING] laws router failed: {e}")

try:
    from api import judgments
    app.include_router(judgments.router, prefix="/api/judgments", tags=["Judgments"])
except Exception as e:
    print(f"[WARNING] judgments router failed: {e}")

try:
    from api import draft
    app.include_router(draft.router, prefix="/api/draft", tags=["Draft"])
except Exception as e:
    print(f"[WARNING] draft router failed: {e}")

try:
    from api import alerts
    app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
except Exception as e:
    print(f"[WARNING] alerts router failed: {e}")

try:
    from api import matter
    app.include_router(matter.router, prefix="/api/matter", tags=["Matters"])
except Exception as e:
    print(f"[WARNING] matter router failed: {e}")

try:
    from api import scrape
    app.include_router(scrape.router, prefix="/api/scrape", tags=["Admin"])
except Exception as e:
    print(f"[WARNING] scrape router failed: {e}")

try:
    from api import suggestions
    app.include_router(suggestions.router, prefix="/api/suggestions", tags=["Suggestions"])
except Exception as e:
    print(f"[WARNING] suggestions router failed: {e}")

try:
    from api import documents
    app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
except Exception as e:
    print(f"[WARNING] documents router failed: {e}")

try:
    from api import igaming
    app.include_router(igaming.router, prefix="/api/igaming", tags=["iGaming"])
except Exception as e:
    print(f"[WARNING] igaming router failed: {e}")


@app.get("/")
async def root():
    return {
        "message": "Ligi4Friends API",
        "description": "Il-liġi Maltija — miftuħa għal kulħadd",
        "docs": "/docs",
    }
