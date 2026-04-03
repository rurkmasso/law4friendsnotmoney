"""
Free local embeddings using sentence-transformers.
Zero cost — runs on your machine, no API calls.
Falls back to a simple hash-based vector if sentence-transformers not installed.
"""
import hashlib

try:
    from sentence_transformers import SentenceTransformer
    from config import settings
    HAS_ST = True
except ImportError:
    HAS_ST = False

_model = None


def get_model():
    global _model
    if not HAS_ST:
        return None
    if _model is None:
        from config import settings
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed(text: str) -> list[float]:
    model = get_model()
    if model is None:
        # Fallback: deterministic 384-dim vector from text hash
        h = hashlib.sha384(text.encode()).digest()
        return [b / 255.0 for b in h]
    text = text[:8000]
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = get_model()
    if model is None:
        return [embed(t) for t in texts]
    texts = [t[:8000] for t in texts]
    vectors = model.encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=True)
    return vectors.tolist()
