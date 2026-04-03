from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://lexmalta:lexmalta@localhost:5432/lexmalta"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Anthropic
    anthropic_api_key: str = ""

    # Model routing — use Haiku for simple lookups, Sonnet for complex reasoning
    model_simple: str = "claude-haiku-4-5-20251001"
    model_complex: str = "claude-sonnet-4-6"

    # RAG
    embedding_model: str = "all-MiniLM-L6-v2"  # free, local
    top_k_retrieval: int = 6
    cache_ttl_seconds: int = 86400  # 24h — same query = free repeat

    # Rate limiting (protects Claude API bill)
    rate_limit_anonymous: int = 20   # queries per day per IP
    rate_limit_registered: int = 200  # queries per day per user

    class Config:
        env_file = ".env"


settings = Settings()
