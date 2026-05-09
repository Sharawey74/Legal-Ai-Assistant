import chromadb
from app.config import settings

def search_chunks(query_embedding: list[float], user_id: str, document_ids: list[str], top_k: int = 5) -> list[dict]:
    client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    collection = client.get_or_create_collection(name="legal_docs")
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"$and": [{"user_id": user_id}, {"document_id": {"$in": document_ids}}]}
    )
    
    chunks = []
    if results["documents"]:
        for i in range(len(results["documents"][0])):
            chunks.append({
                "text": results["documents"][0][i],
                "filename": results["metadatas"][0][i]["filename"],
                "page_number": results["metadatas"][0][i].get("page_number", 1)
            })
    return chunks
