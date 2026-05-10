import logging
from functools import lru_cache
from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_chroma_client():
    """Initialize and cache the ChromaDB persistent client."""
    import chromadb
    logger.info(f"Initializing ChromaDB at: {settings.CHROMA_PERSIST_PATH}")
    return chromadb.PersistentClient(path=settings.CHROMA_PERSIST_PATH)


def _get_collection(user_id: str):
    """Return (or create) a per-user ChromaDB collection."""
    client = _get_chroma_client()
    collection_name = f"user_{user_id}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def store_chunks(
    user_id:     str,
    document_id: str,
    filename:    str,
    chunks:      list[dict],   # [{"text": str, "page_number": int, "embedding": list[float]}]
) -> None:
    """
    Upsert document chunks into the user's ChromaDB collection.
    Each chunk gets a globally unique ID: <document_id>_chunk_<n>.
    """
    collection = _get_collection(user_id)

    ids        = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
    embeddings = [c["embedding"] for c in chunks]
    documents  = [c["text"]      for c in chunks]
    metadatas  = [
        {"document_id": document_id, "filename": filename, "page_number": c["page_number"]}
        for c in chunks
    ]

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )
    logger.info(f"Stored {len(chunks)} chunks for document {document_id} in collection {collection.name}")


def search_chunks(
    query_embedding: list[float],
    user_id:         str,
    document_ids:    list[str],
    top_k:           int = 5,
) -> list[dict]:
    """
    Retrieve top-k chunks from ChromaDB, filtered to the given document IDs.
    Returns a list of dicts: {"text", "filename", "page_number", "document_id"}
    """
    collection = _get_collection(user_id)

    where_filter = (
        {"document_id": {"$in": document_ids}}
        if len(document_ids) > 1
        else {"document_id": document_ids[0]}
    ) if document_ids else {}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        where=where_filter if document_ids else None,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({
            "text":        doc,
            "filename":    meta.get("filename", "unknown"),
            "page_number": meta.get("page_number", 0),
            "document_id": meta.get("document_id", ""),
        })
    return chunks


def delete_document_chunks(user_id: str, document_id: str) -> None:
    """Remove all chunks associated with a document from ChromaDB."""
    collection = _get_collection(user_id)
    collection.delete(where={"document_id": document_id})
    logger.info(f"Deleted all chunks for document {document_id}")
