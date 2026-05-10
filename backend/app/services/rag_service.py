import time
import logging
from app.ai.embedder import embed_text
from app.ai.vector_store import search_chunks
from app.ai.chain import run_rag_chain

logger = logging.getLogger(__name__)


class RAGService:
    def run(
        self,
        query: str,
        user_id: str,
        document_ids: list[str],
        top_k: int = 3,
        is_thinking_mode: bool = False,
    ) -> dict:
        """
        Full pipeline: embed query → retrieve chunks → generate cited answer.

        Returns:
        {
          "answer": str,
          "citations": [{"document_name": str, "page_number": int, "excerpt": str}],
          "latency_breakdown": {"embed_ms": int, "retrieve_ms": int, "generate_ms": int, "total_ms": int}
        }
        """
        t_total = time.perf_counter()

        # Step 1: Embed the query
        t0 = time.perf_counter()
        query_embedding = embed_text(query)
        embed_ms = int((time.perf_counter() - t0) * 1000)

        # Step 2: Retrieve top-k chunks from ChromaDB
        t0 = time.perf_counter()
        chunks = search_chunks(
            query_embedding=query_embedding,
            user_id=user_id,
            document_ids=document_ids,
            top_k=top_k,
        )
        retrieve_ms = int((time.perf_counter() - t0) * 1000)

        # Step 3: Generate answer with citations via LangChain chain
        t0 = time.perf_counter()
        result = run_rag_chain(query=query, chunks=chunks, is_thinking_mode=is_thinking_mode)
        generate_ms = int((time.perf_counter() - t0) * 1000)

        total_ms = int((time.perf_counter() - t_total) * 1000)

        logger.info(
            f"RAG pipeline: embed={embed_ms}ms | retrieve={retrieve_ms}ms | "
            f"generate={generate_ms}ms | total={total_ms}ms | chunks_found={len(chunks)}"
        )

        return {
            "answer":    result["answer"],
            "citations": result["citations"],
            "latency_breakdown": {
                "embed_ms":    embed_ms,
                "retrieve_ms": retrieve_ms,
                "generate_ms": generate_ms,
                "total_ms":    total_ms,
            },
        }
