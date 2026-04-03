"""
Free local embeddings using sentence-transformers.
Zero cost — runs on your machine, no API calls.
"""
from sentence_transformers import SentenceTransformer
from config import settings
import numpy as np

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed(text: str) -> list[float]:
    model = get_model()
    text = text[:8000]  # cap to avoid memory issues
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = get_model()
    texts = [t[:8000] for t in texts]
    vectors = model.encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=True)
    return vectors.tolist()
