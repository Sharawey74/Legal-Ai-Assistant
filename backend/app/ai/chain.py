import time
import logging
from typing import Generator
from langchain_core.output_parsers import StrOutputParser
from app.ai.prompts import build_rag_prompt, build_context_block
from app.ai.llm_client import get_llm

logger = logging.getLogger(__name__)


def run_rag_chain(query: str, chunks: list[dict], is_thinking_mode: bool = False) -> dict:
    """
    Execute the RAG pipeline (non-streaming):
    1. Build context from retrieved chunks
    2. Invoke LLM via LangChain LCEL chain
    3. Return answer text and structured citations

    Returns: {"answer": str, "citations": list[dict], "latency_ms": int}
    """
    if not chunks:
        return {
            "answer": "I could not find relevant information in the provided documents for this question.",
            "citations": [],
            "latency_ms": 0,
        }

    t_start = time.perf_counter()

    context = build_context_block(chunks)
    prompt  = build_rag_prompt()
    llm     = get_llm(is_thinking_mode)
    chain   = prompt | llm | StrOutputParser()

    try:
        answer = chain.invoke({"context": context, "question": query})
    except Exception as e:
        logger.error(f"Error invoking LLM in RAG chain: {e}")
        answer = "I'm sorry, I encountered an error while communicating with the AI service. Please verify the API keys."

    latency_ms = int((time.perf_counter() - t_start) * 1000)

    # Citations derived from retrieved chunks — not parsed from LLM output.
    # This guarantees citation accuracy regardless of LLM output formatting.
    citations = [
        {
            "document_name": c["filename"],
            "page_number":   c["page_number"],
            "excerpt":       c["text"][:300].strip(),
        }
        for c in chunks
    ]

    logger.info(f"RAG chain completed: latency={latency_ms}ms | chunks={len(chunks)}")
    return {"answer": answer, "citations": citations, "latency_ms": latency_ms}


def stream_rag_chain(query: str, chunks: list[dict], is_thinking_mode: bool = False) -> Generator[str, None, None]:
    """
    Execute the RAG pipeline with token-level streaming.

    Yields Server-Sent Events (SSE) formatted strings:
      - data: [TTFT]<ms>\\n\\n         — time-to-first-token (milliseconds), fired once before first token
      - data: <token>\\n\\n            — during generation
      - data: [CITATIONS]<json>\\n\\n  — after generation (citations payload)
      - data: [DONE]\\n\\n             — signals end of stream
    """
    import json

    if not chunks:
        yield "data: I could not find relevant information in the provided documents for this question.\n\n"
        yield "data: [CITATIONS][]\n\n"
        yield "data: [DONE]\n\n"
        return

    context = build_context_block(chunks)
    prompt  = build_rag_prompt()
    llm     = get_llm(is_thinking_mode)
    chain   = prompt | llm | StrOutputParser()

    citations = [
        {
            "document_name": c["filename"],
            "page_number":   c["page_number"],
            "excerpt":       c["text"][:300].strip(),
        }
        for c in chunks
    ]

    try:
        t_stream_start   = time.perf_counter()
        first_token_sent = False

        for token in chain.stream({"context": context, "question": query}):
            if token:
                # Emit TTFT event exactly once — before the very first content token
                if not first_token_sent:
                    ttft_ms = int((time.perf_counter() - t_stream_start) * 1000)
                    yield f"data: [TTFT]{ttft_ms}\n\n"
                    first_token_sent = True
                    logger.info(f"TTFT: {ttft_ms}ms | thinking_mode={is_thinking_mode}")

                safe_token = token.replace("\n", "\\n")
                yield f"data: {safe_token}\n\n"

        citations_json = json.dumps(citations)
        yield f"data: [CITATIONS]{citations_json}\n\n"

    except Exception as e:
        logger.error(f"Streaming RAG chain error: {e}")
        yield f"data: I'm sorry, I encountered an error while communicating with the AI service. Please verify the API keys.\n\n"
        yield f"data: [ERROR] An error occurred during generation.\n\n"

    finally:
        yield "data: [DONE]\n\n"
