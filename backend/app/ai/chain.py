import json
import logging
from typing import Generator
from langchain_core.output_parsers import StrOutputParser
from app.ai.prompts import build_rag_prompt, build_context_block
from app.ai.llm_client import get_llm

logger = logging.getLogger(__name__)

def stream_rag_chain(query: str, chunks: list[dict]) -> Generator[str, None, None]:
    """
    Execute the RAG pipeline with token-level streaming.
    Yields SSE formatted strings.
    """
    if not chunks:
        yield "data: I could not find relevant information in the provided documents for this question.\n\n"
        yield "data: [CITATIONS][]\n\n"
        yield "data: [DONE]\n\n"
        return

    context = build_context_block(chunks)
    prompt  = build_rag_prompt()
    llm     = get_llm()
    chain   = prompt | llm | StrOutputParser()

    citations = [
        {
            "document_name": c["filename"],
            "page_number":   c.get("page_number", 1),
            "excerpt":       c["text"][:300].strip(),
        }
        for c in chunks
    ]

    try:
        for token in chain.stream({"context": context, "question": query}):
            if token:
                safe_token = token.replace("\n", "\\n")
                yield f"data: {safe_token}\n\n"

        yield f"data: [CITATIONS]{json.dumps(citations)}\n\n"
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield "data: [ERROR] An error occurred during generation.\n\n"
    finally:
        yield "data: [DONE]\n\n"

def run_rag_chain(query: str, chunks: list[dict]) -> dict:
    """Non-streaming version"""
    if not chunks:
        return {"answer": "No info found.", "citations": []}
    
    context = build_context_block(chunks)
    prompt  = build_rag_prompt()
    llm     = get_llm()
    chain   = prompt | llm | StrOutputParser()
    
    answer = chain.invoke({"context": context, "question": query})
    citations = [
        {
            "document_name": c["filename"],
            "page_number":   c.get("page_number", 1),
            "excerpt":       c["text"][:300].strip(),
        }
        for c in chunks
    ]
    return {"answer": answer, "citations": citations}
