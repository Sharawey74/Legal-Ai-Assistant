import logging
from functools import lru_cache
from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_embedding_model():
    """Load and cache the HuggingFace embedding model."""
    from langchain_huggingface import HuggingFaceEmbeddings
    logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
    return HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def embed_text(text: str) -> list[float]:
    """Embed a single string and return its vector."""
    model = _get_embedding_model()
    return model.embed_query(text)


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed a list of document chunks in batch."""
    model = _get_embedding_model()
    return model.embed_documents(texts)
