import time
import logging
from app.ai.embedder import embed_text
from app.ai.vector_store import search_chunks
from app.ai.chain import run_rag_chain

logger = logging.getLogger(__name__)

class RAGService:
    def run(self, query: str, user_id: str, document_ids: list[str], top_k: int = 5) -> dict:
        t_total = time.perf_counter()
        
        # Step 1: Embed
        t0 = time.perf_counter()
        query_embedding = embed_text(query)
        embed_ms = int((time.perf_counter() - t0) * 1000)
        
        # Step 2: Retrieve
        t0 = time.perf_counter()
        chunks = search_chunks(
            query_embedding=query_embedding,
            user_id=user_id,
            document_ids=document_ids,
            top_k=top_k
        )
        retrieve_ms = int((time.perf_counter() - t0) * 1000)
        
        # Step 3: Generate
        t0 = time.perf_counter()
        result = run_rag_chain(query=query, chunks=chunks)
        generate_ms = int((time.perf_counter() - t0) * 1000)
        
        total_ms = int((time.perf_counter() - t_total) * 1000)
        
        return {
            "answer": result["answer"],
            "citations": result["citations"],
            "latency_breakdown": {
                "embed_ms": embed_ms,
                "retrieve_ms": retrieve_ms,
                "generate_ms": generate_ms,
                "total_ms": total_ms
            }
        }
