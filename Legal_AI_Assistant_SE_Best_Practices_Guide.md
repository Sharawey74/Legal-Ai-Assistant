# Legal AI Assistant — Software Engineering Best Practices Guide
## Architecture · Design Patterns · Clean Code · Performance

> **Project Root:** `C:\Users\DELL\Desktop\Legal-Ai-Assistant\`
> **Primary LLM:** OpenRouter — `openai/gpt-oss-120b` (free)
> **Embedding Model:** `BAAI/bge-base-en-v1.5`
> **Optional Local LLM:** Ollama — `llama3.2:3b`

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Backend Design Patterns](#2-backend-design-patterns)
3. [AI/RAG Layer Patterns](#3-airag-layer-patterns)
4. [Frontend Architecture Patterns](#4-frontend-architecture-patterns)
5. [Clean Code Standards](#5-clean-code-standards)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Performance & Efficiency Guidelines](#7-performance--efficiency-guidelines)
8. [Testing Strategy](#8-testing-strategy)
9. [Security Best Practices](#9-security-best-practices)
10. [Project File Structure (Canonical)](#10-project-file-structure-canonical)

---

## 1. System Architecture Overview

### 1.1 Layered Architecture (N-Tier)

The project follows a strict **Layered Architecture** (also called N-Tier). Each layer has a single responsibility and communicates only with its immediate neighbor. Skipping layers is not permitted.

```
┌───────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│         React 18 · TypeScript · TailwindCSS · Vite        │
│   Pages · Components · Contexts · Hooks · API Clients     │
└──────────────────────────┬────────────────────────────────┘
                           │ HTTP/JSON (REST)
┌──────────────────────────▼────────────────────────────────┐
│                     API GATEWAY LAYER                      │
│              FastAPI Routers · JWT Middleware              │
│          Input Validation · CORS · Rate Limiting          │
└──────────────────────────┬────────────────────────────────┘
                           │ Validated DTOs (Pydantic)
┌──────────────────────────▼────────────────────────────────┐
│                    SERVICE LAYER                           │
│    AuthService · DocumentService · ChatService            │
│    RAGService — orchestrates the AI pipeline              │
└───────────┬──────────────────────┬────────────────────────┘
            │                      │
┌───────────▼──────────┐  ┌────────▼───────────────────────┐
│   REPOSITORY LAYER   │  │        AI / RAG LAYER          │
│  SQLAlchemy ORM      │  │  Embedder · VectorStore · LLM  │
│  SQLite (Dev)        │  │  Chain (LangChain LCEL)        │
└───────────┬──────────┘  └────────┬───────────────────────┘
            │                      │
┌───────────▼──────────┐  ┌────────▼───────────────────────┐
│   DATA STORAGE       │  │     VECTOR STORAGE             │
│   SQLite DB          │  │     ChromaDB (local)           │
│   File System        │  │     BAAI/bge-base-en-v1.5      │
└──────────────────────┘  └────────────────────────────────┘
```

### 1.2 Architecture Principles Applied

| Principle | Application in This Project |
|---|---|
| **Separation of Concerns** | Routers handle HTTP only; Services hold business logic; Repositories handle persistence |
| **Single Responsibility** | Each class/module does exactly one thing (e.g., `Embedder` only embeds, `VectorStore` only retrieves) |
| **Dependency Inversion** | Services receive `db: Session` via FastAPI `Depends()` — not created internally |
| **DRY (Don't Repeat Yourself)** | Shared utilities in `utils/`, shared UI primitives in `components/ui/` |
| **Open/Closed Principle** | LLM provider selection via `LLM_PROVIDER` env var — add new providers without changing calling code |
| **Interface Segregation** | Pydantic schemas separate request/response shapes from ORM models |

---

## 2. Backend Design Patterns

### 2.1 Repository Pattern

**Problem:** Services should not write raw SQL or ORM queries — this couples business logic to the database engine.

**Solution:** Each model gets a dedicated Repository class that owns all database access for that entity. Services call repositories; they never touch `db.query()` directly.

```python
# backend/app/repositories/base_repository.py
from typing import Generic, TypeVar, Type
from sqlalchemy.orm import Session
from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic base repository providing CRUD operations.
    Concrete repositories inherit this and add domain-specific queries.
    
    Pattern: Repository Pattern (Martin Fowler — Patterns of Enterprise Application Architecture)
    Benefit: Isolates persistence logic; services remain database-agnostic.
    """

    def __init__(self, model: Type[ModelType], db: Session) -> None:
        self._model = model
        self._db = db

    def get_by_id(self, record_id: str) -> ModelType | None:
        return self._db.query(self._model).filter(
            self._model.id == record_id
        ).first()

    def get_all(self) -> list[ModelType]:
        return self._db.query(self._model).all()

    def create(self, instance: ModelType) -> ModelType:
        self._db.add(instance)
        self._db.commit()
        self._db.refresh(instance)
        return instance

    def delete(self, instance: ModelType) -> None:
        self._db.delete(instance)
        self._db.commit()

    def save(self) -> None:
        self._db.commit()
```

```python
# backend/app/repositories/document_repository.py
from sqlalchemy.orm import Session
from app.models.document import Document
from app.repositories.base_repository import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """
    All database access for the Document entity lives here.
    Services use this class; they never write ORM queries directly.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Document, db)

    def get_by_user(self, user_id: str) -> list[Document]:
        return (
            self._db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.created_at.desc())
            .all()
        )

    def get_by_user_and_id(self, document_id: str, user_id: str) -> Document | None:
        return (
            self._db.query(Document)
            .filter(Document.id == document_id, Document.user_id == user_id)
            .first()
        )

    def update_status(self, document: Document, status: str, page_count: int = 0) -> Document:
        document.status = status
        if page_count:
            document.page_count = page_count
        self._db.commit()
        self._db.refresh(document)
        return document
```

```python
# backend/app/repositories/user_repository.py
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """All database access for the User entity."""

    def __init__(self, db: Session) -> None:
        super().__init__(User, db)

    def get_by_email(self, email: str) -> User | None:
        return self._db.query(User).filter(User.email == email).first()
```

```python
# backend/app/repositories/chat_repository.py
from sqlalchemy.orm import Session
from app.models.chat import ChatSession, ChatMessage
from app.repositories.base_repository import BaseRepository


class ChatSessionRepository(BaseRepository[ChatSession]):
    def __init__(self, db: Session) -> None:
        super().__init__(ChatSession, db)

    def get_by_user(self, user_id: str) -> list[ChatSession]:
        return (
            self._db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
            .all()
        )

    def get_by_user_and_id(self, session_id: str, user_id: str) -> ChatSession | None:
        return (
            self._db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )


class ChatMessageRepository(BaseRepository[ChatMessage]):
    def __init__(self, db: Session) -> None:
        super().__init__(ChatMessage, db)

    def get_by_session_ordered(self, session_id: str) -> list[ChatMessage]:
        return (
            self._db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
            .all()
        )
```

**Updated Services (now use repositories, not raw ORM):**

```python
# backend/app/services/document_service.py  — with Repository Pattern applied
class DocumentService:
    """
    Orchestrates document lifecycle: upload → process → embed → store.
    Delegates all DB access to DocumentRepository.
    """

    def __init__(self, db: Session) -> None:
        self._repo = DocumentRepository(db)               # ← Repository, not raw db
        self._processor = DocumentProcessor()              # ← Injected processor
        self._vector_store = VectorStoreService()         # ← Injected vector store

    def list_documents(self, user_id: str) -> list[Document]:
        return self._repo.get_by_user(user_id)            # ← Clean delegation

    def delete_document(self, document_id: str, user_id: str) -> None:
        document = self._repo.get_by_user_and_id(document_id, user_id)
        if not document:
            raise DocumentNotFoundError(document_id)
        self._vector_store.delete_document_chunks(document_id)
        self._cleanup_file(document)
        self._repo.delete(document)
```

---

### 2.2 Factory Pattern (LLM Provider)

**Problem:** The system must support multiple LLM backends (OpenRouter, Ollama) without callers knowing which one is active.

**Solution:** A `LLMFactory` reads config and returns the correct `BaseChatModel` instance. Callers always use the abstract interface.

```python
# backend/app/ai/llm_factory.py
from functools import lru_cache
from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings


class LLMFactory:
    """
    Factory Pattern: Centralises LLM instantiation logic.
    Adding a new provider = add one branch here; nothing else changes.

    Pattern: Factory Method (GoF)
    Benefit: Open for extension, closed for modification (OCP).
    """

    @staticmethod
    def create() -> BaseChatModel:
        provider = settings.LLM_PROVIDER.lower()
        creators = {
            "openrouter": LLMFactory._create_openrouter,
            "ollama":     LLMFactory._create_ollama,
        }
        creator = creators.get(provider)
        if not creator:
            raise ValueError(
                f"Unknown LLM_PROVIDER '{provider}'. "
                f"Valid options: {list(creators.keys())}"
            )
        return creator()

    @staticmethod
    def _create_openrouter() -> BaseChatModel:
        from langchain_openai import ChatOpenAI
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set in .env")
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.OPENROUTER_MODEL,
            temperature=0.1,
            max_tokens=1024,
        )

    @staticmethod
    def _create_ollama() -> BaseChatModel:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0.1,
        )


@lru_cache(maxsize=1)
def get_llm() -> BaseChatModel:
    """
    Singleton accessor via lru_cache.
    The LLM client is instantiated exactly once per process lifecycle.
    Pattern: Singleton (via module-level cache)
    """
    return LLMFactory.create()
```

---

### 2.3 Singleton Pattern (Embedding Model & ChromaDB)

**Problem:** Loading the embedding model and connecting ChromaDB are expensive operations that must not repeat per request.

**Solution:** Use `@lru_cache(maxsize=1)` on the accessor function. Python guarantees a single instance per process. This is the idiomatic Singleton in Python — simpler and safer than a Singleton class.

```python
# backend/app/ai/embedder.py
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.config import settings


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Singleton Pattern via lru_cache.
    Model loads once (~430 MB download on first run, then cached to disk).
    All subsequent calls return the same in-memory instance.
    """
    return SentenceTransformer(settings.EMBEDDING_MODEL)


class Embedder:
    """
    Encapsulates all embedding operations.
    Depends on get_embedding_model() — never creates its own model.
    """

    def embed_single(self, text: str) -> list[float]:
        """Embed a single query string. Used for RAG query embedding."""
        return get_embedding_model().encode(
            text, normalize_embeddings=True
        ).tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """
        Embed many texts efficiently in one forward pass.
        batch_size=32 balances memory and throughput on CPU.
        Used during document ingestion.
        """
        return get_embedding_model().encode(
            texts, normalize_embeddings=True, batch_size=batch_size
        ).tolist()
```

---

### 2.4 Strategy Pattern (Document Processors)

**Problem:** Text extraction logic differs per file type (.pdf, .txt, .md, .docx). A cascade of `if/elif` blocks is fragile and violates OCP.

**Solution:** Define a `DocumentExtractor` protocol. Each file type gets its own extractor class. A `ProcessorRegistry` maps extensions to extractors.

```python
# backend/app/utils/extractors.py
from typing import Protocol
from pathlib import Path
import fitz
import docx as python_docx
from app.utils.text_models import PageText


class DocumentExtractor(Protocol):
    """
    Strategy interface for document text extraction.
    Any class implementing extract() can be registered.

    Pattern: Strategy (GoF)
    Benefit: Adding a new file type = create one class, register it. Nothing else changes.
    """

    def extract(self, file_path: str) -> list[PageText]: ...


class PDFExtractor:
    """Extracts text page-by-page from PDF files using PyMuPDF."""

    def extract(self, file_path: str) -> list[PageText]:
        pages: list[PageText] = []
        with fitz.open(file_path) as doc:
            for page_num, page in enumerate(doc, start=1):
                text = page.get_text("text").strip()
                if text:
                    pages.append(PageText(page_number=page_num, text=text))
        return pages


class PlainTextExtractor:
    """Extracts text from .txt and .md files as a single virtual page."""

    def extract(self, file_path: str) -> list[PageText]:
        content = Path(file_path).read_text(encoding="utf-8", errors="ignore").strip()
        return [PageText(page_number=1, text=content)] if content else []


class DocxExtractor:
    """Extracts paragraph text from .docx files as a single virtual page."""

    def extract(self, file_path: str) -> list[PageText]:
        doc = python_docx.Document(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        content = "\n\n".join(paragraphs)
        return [PageText(page_number=1, text=content)] if content else []


class ProcessorRegistry:
    """
    Registry of file extension → extractor strategy.
    Decouples dispatch logic from extraction logic entirely.
    """

    _registry: dict[str, DocumentExtractor] = {
        ".pdf":  PDFExtractor(),
        ".txt":  PlainTextExtractor(),
        ".md":   PlainTextExtractor(),
        ".docx": DocxExtractor(),
    }

    @classmethod
    def get(cls, extension: str) -> DocumentExtractor:
        extractor = cls._registry.get(extension.lower())
        if not extractor:
            supported = ", ".join(cls._registry.keys())
            raise ValueError(
                f"Unsupported file type '{extension}'. Supported: {supported}"
            )
        return extractor

    @classmethod
    def supported_extensions(cls) -> set[str]:
        return set(cls._registry.keys())
```

```python
# backend/app/utils/document_processor.py
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.utils.extractors import ProcessorRegistry
from app.utils.text_models import PageText, ProcessedChunk
from pathlib import Path
import fitz


class DocumentProcessor:
    """
    Orchestrates extraction → chunking.
    Delegates extraction strategy selection to ProcessorRegistry.
    Chunk parameters are tuned for legal document paragraph density.
    """

    CHUNK_SIZE    = 800    # characters — fits a dense legal paragraph
    CHUNK_OVERLAP = 100    # characters — preserves cross-boundary context

    def __init__(self) -> None:
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.CHUNK_SIZE,
            chunk_overlap=self.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def process(self, file_path: str) -> list[ProcessedChunk]:
        """Full pipeline: extract text pages, then chunk them."""
        ext = Path(file_path).suffix.lower()
        extractor = ProcessorRegistry.get(ext)
        pages = extractor.extract(file_path)
        return self._chunk(pages)

    def get_page_count(self, file_path: str) -> int:
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            with fitz.open(file_path) as doc:
                return len(doc)
        return 1

    def _chunk(self, pages: list[PageText]) -> list[ProcessedChunk]:
        chunks: list[ProcessedChunk] = []
        global_index = 0
        for page in pages:
            for split in self._splitter.split_text(page.text):
                if split.strip():
                    chunks.append(ProcessedChunk(
                        text=split.strip(),
                        page_number=page.page_number,
                        chunk_index=global_index,
                    ))
                    global_index += 1
        return chunks
```

---

### 2.5 Custom Exception Hierarchy

**Problem:** Raising generic `HTTPException` directly inside services couples business logic to the HTTP layer.

**Solution:** Define domain exceptions. Routers (or a global exception handler) translate them to HTTP responses.

```python
# backend/app/exceptions.py


class LegalAIError(Exception):
    """Base exception for all domain errors in the Legal AI Assistant."""


class AuthenticationError(LegalAIError):
    """Raised when credentials are invalid or a token cannot be verified."""


class DuplicateEmailError(LegalAIError):
    """Raised when registration is attempted with an existing email."""
    def __init__(self, email: str) -> None:
        super().__init__(f"An account with email '{email}' already exists.")
        self.email = email


class DocumentNotFoundError(LegalAIError):
    """Raised when a document does not exist or does not belong to the requester."""
    def __init__(self, document_id: str) -> None:
        super().__init__(f"Document '{document_id}' not found.")
        self.document_id = document_id


class DocumentProcessingError(LegalAIError):
    """Raised when text extraction or embedding fails."""


class ChatSessionNotFoundError(LegalAIError):
    """Raised when a chat session does not exist or does not belong to the user."""


class UnsupportedFileTypeError(LegalAIError):
    """Raised when an uploaded file has an extension the system cannot process."""
    def __init__(self, extension: str, supported: set[str]) -> None:
        super().__init__(
            f"File type '{extension}' is not supported. "
            f"Supported types: {', '.join(sorted(supported))}"
        )
```

```python
# backend/app/main.py — register exception handlers
from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions import (
    AuthenticationError, DuplicateEmailError,
    DocumentNotFoundError, DocumentProcessingError,
    ChatSessionNotFoundError, UnsupportedFileTypeError,
)

def register_exception_handlers(app: FastAPI) -> None:
    """
    Centralised exception → HTTP response mapping.
    Services raise domain exceptions; this handler converts them.
    Services stay HTTP-agnostic.
    """

    @app.exception_handler(DuplicateEmailError)
    async def duplicate_email(_: Request, exc: DuplicateEmailError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(AuthenticationError)
    async def auth_error(_: Request, exc: AuthenticationError):
        return JSONResponse(status_code=401, content={"detail": str(exc)})

    @app.exception_handler(DocumentNotFoundError)
    async def doc_not_found(_: Request, exc: DocumentNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(UnsupportedFileTypeError)
    async def unsupported_type(_: Request, exc: UnsupportedFileTypeError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(DocumentProcessingError)
    async def processing_error(_: Request, exc: DocumentProcessingError):
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    @app.exception_handler(ChatSessionNotFoundError)
    async def session_not_found(_: Request, exc: ChatSessionNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})
```

---

## 3. AI/RAG Layer Patterns

### 3.1 Pipeline Pattern (RAG Chain)

The RAG pipeline is a sequential chain of discrete, testable steps. Each step has a single input and output type. This makes individual steps independently testable and swappable.

```
User Query (str)
     │
     ▼
┌─────────────┐
│  Embedder   │  embed_single(query) → list[float]
│  Step 1     │  Model: BAAI/bge-base-en-v1.5
└──────┬──────┘
       │ query_embedding: list[float]
       ▼
┌─────────────┐
│  Retriever  │  search_chunks(embedding, user_id, doc_ids, k=5)
│  Step 2     │  Store: ChromaDB (cosine similarity)
└──────┬──────┘
       │ chunks: list[dict]  (text, filename, page_number, distance)
       ▼
┌─────────────┐
│  Augmentor  │  build_context_block(chunks) → str
│  Step 3     │  Formats numbered, cited context for the prompt
└──────┬──────┘
       │ context: str
       ▼
┌─────────────┐
│  Generator  │  prompt | llm | StrOutputParser()
│  Step 4     │  LLM: openai/gpt-oss-120b or llama3.2:3b
└──────┬──────┘
       │ answer: str
       ▼
┌─────────────┐
│  Citator    │  Derives citations from retrieved chunks (not parsed from LLM output)
│  Step 5     │  Guarantees citation accuracy regardless of LLM formatting
└──────┬──────┘
       │
       ▼
   RAGResult(answer, citations, latency_breakdown)
```

```python
# backend/app/ai/rag_pipeline.py
import time
import logging
from dataclasses import dataclass
from app.ai.embedder import Embedder
from app.ai.vector_store import VectorStoreService
from app.ai.chain import ChainExecutor

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RAGResult:
    """
    Immutable value object representing the output of the RAG pipeline.
    
    Pattern: Value Object (DDD)
    Benefit: Thread-safe, hashable, no accidental mutation.
    """
    answer:             str
    citations:          list[dict]
    latency_breakdown:  dict[str, int]


class RAGPipeline:
    """
    Orchestrates the full Retrieval-Augmented Generation pipeline.
    Composes Embedder, VectorStore, and ChainExecutor.
    Each step is independently testable by injecting mocks.
    
    Pattern: Pipeline / Chain of Responsibility
    Benefit: Steps are discrete, measurable, and replaceable.
    """

    def __init__(
        self,
        embedder:     Embedder | None = None,
        vector_store: VectorStoreService | None = None,
        chain:        ChainExecutor | None = None,
    ) -> None:
        # Default to real implementations; tests inject fakes
        self._embedder     = embedder     or Embedder()
        self._vector_store = vector_store or VectorStoreService()
        self._chain        = chain        or ChainExecutor()

    def run(
        self,
        query:        str,
        user_id:      str,
        document_ids: list[str],
        top_k:        int = 5,
    ) -> RAGResult:
        t_total = time.perf_counter()

        # Step 1 — Embed query
        t0 = time.perf_counter()
        query_embedding = self._embedder.embed_single(query)
        embed_ms = self._elapsed_ms(t0)

        # Step 2 — Retrieve relevant chunks
        t0 = time.perf_counter()
        chunks = self._vector_store.search(
            query_embedding=query_embedding,
            user_id=user_id,
            document_ids=document_ids,
            top_k=top_k,
        )
        retrieve_ms = self._elapsed_ms(t0)

        # Steps 3–5 — Augment, Generate, Cite
        t0 = time.perf_counter()
        chain_result = self._chain.execute(query=query, chunks=chunks)
        generate_ms = self._elapsed_ms(t0)

        total_ms = self._elapsed_ms(t_total)

        logger.info(
            "RAG pipeline complete | embed=%dms retrieve=%dms generate=%dms total=%dms chunks=%d",
            embed_ms, retrieve_ms, generate_ms, total_ms, len(chunks),
        )

        return RAGResult(
            answer=chain_result.answer,
            citations=chain_result.citations,
            latency_breakdown={
                "embed_ms":    embed_ms,
                "retrieve_ms": retrieve_ms,
                "generate_ms": generate_ms,
                "total_ms":    total_ms,
            },
        )

    @staticmethod
    def _elapsed_ms(start: float) -> int:
        return int((time.perf_counter() - start) * 1000)
```

### 3.2 Prompt Engineering Best Practices

```python
# backend/app/ai/prompts.py
from langchain_core.prompts import ChatPromptTemplate

# System prompt is a module-level constant.
# Never build prompts dynamically inside a loop or request handler.
LEGAL_SYSTEM_PROMPT = """\
You are a legal research assistant. Your role is to help users understand \
legal documents they have uploaded.

STRICT RULES:
1. Answer ONLY using the document excerpts provided below.
2. Cite every factual claim using the format: [Doc: <filename>, Page: <N>]
3. If the answer is not found in the excerpts, respond exactly:
   "I could not find relevant information in the provided documents for this question."
4. Never invent legal citations, case names, statutes, or facts not present \
in the excerpts.
5. Keep answers structured and concise.

DISCLAIMER: This tool is for legal research only. Always consult a licensed \
attorney for legal advice.\
"""

# Prompt template is built once, not per request.
# Using module-level construction avoids repeated parsing overhead.
_RAG_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", LEGAL_SYSTEM_PROMPT),
    (
        "human",
        "Document Excerpts:\n{context}\n\n"
        "Question: {question}\n\n"
        "Provide a clear answer with inline citations [Doc: filename, Page: N] "
        "for every factual claim.",
    ),
])


def get_rag_prompt() -> ChatPromptTemplate:
    """Return the pre-built RAG prompt template (singleton accessor)."""
    return _RAG_PROMPT_TEMPLATE


def build_context_block(chunks: list[dict]) -> str:
    """
    Format retrieved chunks into a numbered, cited context block.
    
    Each entry is prefixed with its citation reference so the LLM can
    inline-cite accurately. Chunk order is preserved from vector similarity ranking.
    """
    lines = [
        f"[{i}] [Doc: {c['filename']}, Page: {c['page_number']}]\n{c['text']}"
        for i, c in enumerate(chunks, start=1)
    ]
    return "\n\n".join(lines)
```

---

## 4. Frontend Architecture Patterns

### 4.1 Custom Hook Pattern (API + State Co-location)

**Problem:** Component files grow bloated when they own both UI and data-fetching logic.

**Solution:** Extract all async data logic into custom hooks. Components consume hooks and render only.

```typescript
// frontend/src/hooks/useDocuments.ts
import { useState, useEffect, useCallback } from "react";
import { listDocuments, uploadDocument, deleteDocument } from "../api/documents.api";
import type { Document } from "../types/document.types";

/**
 * Custom hook that owns all document state and operations.
 * 
 * Pattern: Custom Hook (React idiom for logic extraction)
 * Benefit: DocumentsPage renders only; this hook handles all side effects.
 * Testable: can be tested with renderHook() independently of the UI.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDocuments();
      setDocuments(data);
    } catch {
      setError("Failed to load documents. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const upload = useCallback(async (file: File): Promise<Document> => {
    const doc = await uploadDocument(file);
    setDocuments(prev => [doc, ...prev]);
    return doc;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  return { documents, loading, error, upload, remove, refetch: fetchDocuments };
}
```

```typescript
// frontend/src/hooks/useChat.ts
import { useState, useCallback, useRef } from "react";
import { createSession, getMessages, sendMessage } from "../api/chat.api";
import type { ChatMessage, Citation } from "../types/chat.types";

export function useChatSession(initialSessionId?: string) {
  const [sessionId,       setSessionId]       = useState<string | null>(initialSessionId ?? null);
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const selectedDocIds = useRef<string[]>([]);

  const loadSession = useCallback(async (sid: string) => {
    const msgs = await getMessages(sid);
    setSessionId(sid);
    setMessages(msgs);
  }, []);

  const send = useCallback(async (content: string): Promise<string> => {
    setLoading(true);
    try {
      let sid = sessionId;
      if (!sid) {
        const session = await createSession(selectedDocIds.current);
        sid = session.id;
        setSessionId(sid);
      }
      // Optimistic update
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`, session_id: sid, role: "user",
        content, citations: [], created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);

      const reply = await sendMessage(sid, content);
      const refreshed = await getMessages(sid);
      setMessages(refreshed);
      if (reply.citations.length > 0) setActiveCitations(reply.citations);
      return sid;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return {
    sessionId, messages, loading, activeCitations,
    selectedDocIds,
    loadSession, send,
    setActiveCitations,
    setSelectedDocIds: (ids: string[]) => { selectedDocIds.current = ids; },
  };
}
```

### 4.2 API Client Abstraction

```typescript
// frontend/src/api/client.ts
import axios, { AxiosInstance, AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * Single Axios instance for the entire app.
 * Pattern: Singleton + Facade
 * 
 * - Attaches JWT automatically on every request
 * - Handles 401 globally (redirect to login, no per-component handling)
 * - All API modules import this; nothing creates its own axios instance
 */
function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: `${BASE_URL}/api/v1`,
    headers: { "Content-Type": "application/json" },
    timeout: 30_000,   // 30s — generous for LLM response latency
  });

  instance.interceptors.request.use(config => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export default createApiClient();
```

### 4.3 Typed API Module Pattern

```typescript
// frontend/src/api/documents.api.ts
import client from "./client";
import type { Document } from "../types/document.types";

/**
 * All document API calls in one module.
 * Functions are pure: take input, return typed output, no side effects.
 * State management is the caller's responsibility (hooks, not API modules).
 */

export const listDocuments = (): Promise<Document[]> =>
  client.get<Document[]>("/documents").then(r => r.data);

export const uploadDocument = (file: File): Promise<Document> => {
  const form = new FormData();
  form.append("file", file);
  return client
    .post<Document>("/documents", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then(r => r.data);
};

export const deleteDocument = (id: string): Promise<void> =>
  client.delete(`/documents/${id}`).then(() => undefined);
```

---

## 5. Clean Code Standards

### 5.1 Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Python class | `PascalCase` | `DocumentService`, `RAGPipeline` |
| Python function/method | `snake_case` | `get_by_user`, `embed_batch` |
| Python private method | `_snake_case` | `_cleanup_file`, `_chunk` |
| Python constant | `UPPER_SNAKE_CASE` | `CHUNK_SIZE`, `LEGAL_SYSTEM_PROMPT` |
| Python type alias | `PascalCase` | `ModelType`, `PageText` |
| TS/React component | `PascalCase` | `DocumentCard`, `CitationPanel` |
| TS hook | `camelCase` prefixed `use` | `useDocuments`, `useChatSession` |
| TS interface | `PascalCase` | `Document`, `ChatMessage` |
| TS API function | `camelCase` | `listDocuments`, `sendMessage` |
| TS constant | `SCREAMING_SNAKE_CASE` | `MAX_FILE_SIZE_MB` |

### 5.2 Function Design Rules

```python
# ✅ GOOD — one purpose, clear name, typed
def get_page_count(file_path: str) -> int:
    """Return the number of pages in a PDF, or 1 for other file types."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        with fitz.open(file_path) as doc:
            return len(doc)
    return 1

# ❌ BAD — does multiple things, poorly named
def process(path, db, uid):
    # extracts text, chunks it, embeds it, saves to DB, updates status
    # too long, untestable, violates SRP
    ...
```

```python
# ✅ GOOD — guard clauses, early return, no deep nesting
def delete_document(self, document_id: str, user_id: str) -> None:
    document = self._repo.get_by_user_and_id(document_id, user_id)
    if not document:
        raise DocumentNotFoundError(document_id)

    self._vector_store.delete_document_chunks(document_id)
    self._cleanup_file(document)
    self._repo.delete(document)

# ❌ BAD — nested conditions, unclear flow
def delete_document(self, document_id, user_id, db):
    doc = db.query(Document).filter(...).first()
    if doc:
        if doc.user_id == user_id:
            # delete vectors
            # delete file
            db.delete(doc)
            db.commit()
```

### 5.3 Type Annotation Rules

All Python code must be fully typed. Return types are mandatory.

```python
# ✅ GOOD — complete annotations
def build_context_block(chunks: list[dict]) -> str: ...
def embed_batch(texts: list[str], batch_size: int = 32) -> list[list[float]]: ...
async def upload_document(file: UploadFile, user_id: str) -> Document: ...

# ❌ BAD — missing annotations
def embed_batch(texts, batch_size=32): ...
```

### 5.4 Comment Philosophy

```python
# ✅ GOOD — comment explains WHY, not WHAT
# normalize_embeddings=True ensures cosine similarity is accurate for BGE models;
# without normalization, dot-product scores would be misleading.
embeddings = model.encode(texts, normalize_embeddings=True)

# ✅ GOOD — docstring explains contract (not re-states the code)
def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    Retrieve the top-k most similar chunks from ChromaDB.
    Results are scoped to the requesting user's documents only.
    Returns an empty list if the collection has no matching chunks.
    """

# ❌ BAD — comment re-states the code
# add user to database
self.db.add(user)
```

---

## 6. Error Handling Strategy

### 6.1 Three-Layer Error Handling

```
Layer 1 — AI Layer:       Log + re-raise as domain exception
Layer 2 — Service Layer:  Raise typed domain exceptions (no HTTPException)
Layer 3 — Router/Handler: Catch domain exceptions, return HTTP response
```

```python
# Layer 1 — AI chain: log details, surface clean message upward
def execute(self, query: str, chunks: list[dict]) -> ChainResult:
    try:
        answer = self._chain.invoke({"context": context, "question": query})
        return ChainResult(answer=answer, citations=self._derive_citations(chunks))
    except Exception as exc:
        logger.exception("LLM chain invocation failed: %s", exc)
        raise DocumentProcessingError(f"LLM generation failed: {exc}") from exc

# Layer 2 — Service: raise typed domain exception
async def upload_document(self, file: UploadFile, user_id: str) -> Document:
    ext = Path(file.filename).suffix.lower()
    if ext not in ProcessorRegistry.supported_extensions():
        raise UnsupportedFileTypeError(ext, ProcessorRegistry.supported_extensions())
    ...

# Layer 3 — Global handler in main.py (see Section 2.5)
# Services never touch HTTPException; all translation is centralised.
```

### 6.2 Frontend Error Boundaries

```typescript
// frontend/src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props   { children: ReactNode; fallback?: ReactNode; }
interface State   { hasError: boolean; message: string; }

/**
 * Catches unhandled React render errors.
 * Prevents a single broken component from crashing the whole app.
 * Pattern: Error Boundary (React class component pattern)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="text-center max-w-sm">
            <h1 className="text-xl font-semibold text-danger mb-2">Something went wrong</h1>
            <p className="text-sm text-muted">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 7. Performance & Efficiency Guidelines

### 7.1 Backend Performance Rules

| Rule | Reason | Implementation |
|---|---|---|
| Load embedding model once | 430 MB model; ~3s load time | `@lru_cache(maxsize=1)` on `get_embedding_model()` |
| Load LLM client once | API client setup overhead | `@lru_cache(maxsize=1)` on `get_llm()` |
| Batch embed during ingestion | 1 forward pass vs N forward passes | `embed_batch(texts)` in `DocumentService.upload_document` |
| Single query embedding per request | Queries embedded individually (small, fast) | `embed_single(query)` in `RAGPipeline.run` |
| ChromaDB client singleton | Avoids repeated HNSW index loading | `@lru_cache(maxsize=1)` on `get_chroma_collection()` |
| Scope vector search to user_id + doc_ids | Prevents cross-user data leaks and limits search space | `where` filter in `VectorStoreService.search` |
| Use `top_k=5` (not higher) | 5 chunks ~= 4,000 tokens of context; sufficient for legal Q&A | Configurable via `RAGPipeline.run(top_k=5)` |
| Chunk size 800 / overlap 100 | Fits one dense legal paragraph; overlap preserves clause boundaries | `DocumentProcessor` constants |

### 7.2 Frontend Performance Rules

```typescript
// ✅ GOOD — memoize expensive components
import { memo } from "react";

const DocumentCard = memo(function DocumentCard({ document, onDeleted }: Props) {
  // Only re-renders if document or onDeleted changes
  ...
});

// ✅ GOOD — stable callback references prevent child re-renders
const upload = useCallback(async (file: File): Promise<Document> => {
  const doc = await uploadDocument(file);
  setDocuments(prev => [doc, ...prev]);
  return doc;
}, []);   // No deps → never recreated

// ✅ GOOD — functional state updates avoid stale closure bugs
setDocuments(prev => prev.filter(d => d.id !== deletedId));

// ❌ BAD — captures stale state
setDocuments(documents.filter(d => d.id !== deletedId));
```

### 7.3 Latency Targets

| Operation | Target | Typical Actual |
|---|---|---|
| Query embedding | < 100ms | 20–50ms (CPU) |
| ChromaDB retrieval (top-5) | < 50ms | 5–20ms |
| LLM generation (OpenRouter) | < 15s | 3–12s |
| LLM generation (Ollama 3b) | < 60s | 20–45s (CPU) |
| End-to-end RAG response | < 20s avg | 5–15s |
| Document upload + processing | < 30s | 10–25s (first run downloads model) |

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
          ┌──────────────────┐
          │   E2E Tests      │  ← Playwright (login → upload → chat)
          │   (2–3 flows)    │     Run manually before submission
          ├──────────────────┤
          │ Integration Tests│  ← TestClient (FastAPI) + SQLite in-memory
          │  (per router)    │     Test full request → DB round-trip
          ├──────────────────┤
          │   Unit Tests     │  ← pytest, mocked dependencies
          │  (per service/   │     Fast, no DB, no LLM, no network
          │   utility)       │
          └──────────────────┘
```

### 8.2 Unit Test Examples

```python
# backend/tests/unit/test_document_processor.py
import pytest
from unittest.mock import patch, MagicMock
from app.utils.document_processor import DocumentProcessor
from app.utils.text_models import PageText


class TestDocumentProcessor:
    """Unit tests for DocumentProcessor. No file I/O; inputs are mocked."""

    def setup_method(self):
        self.processor = DocumentProcessor()

    def test_chunk_empty_pages_returns_empty_list(self):
        result = self.processor._chunk([])
        assert result == []

    def test_chunk_assigns_sequential_indices(self):
        pages = [PageText(page_number=1, text="A " * 400 + ". " + "B " * 400)]
        chunks = self.processor._chunk(pages)
        indices = [c.chunk_index for c in chunks]
        assert indices == list(range(len(chunks)))

    def test_chunk_preserves_page_number(self):
        pages = [
            PageText(page_number=3, text="X " * 200),
            PageText(page_number=7, text="Y " * 200),
        ]
        chunks = self.processor._chunk(pages)
        page_nums = {c.page_number for c in chunks}
        assert page_nums == {3, 7}

    def test_chunk_strips_whitespace(self):
        pages = [PageText(page_number=1, text="  leading and trailing  ")]
        chunks = self.processor._chunk(pages)
        for chunk in chunks:
            assert chunk.text == chunk.text.strip()
```

```python
# backend/tests/unit/test_auth_service.py
import pytest
from unittest.mock import MagicMock, create_autospec
from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schemas import RegisterRequest, LoginRequest
from app.exceptions import DuplicateEmailError, AuthenticationError
from app.models.user import User


class TestAuthService:
    def setup_method(self):
        self.mock_repo = create_autospec(UserRepository)
        self.service = AuthService(repo=self.mock_repo)

    def test_register_raises_if_email_exists(self):
        self.mock_repo.get_by_email.return_value = MagicMock(spec=User)
        with pytest.raises(DuplicateEmailError):
            self.service.register(RegisterRequest(email="a@b.com", password="pass123"))

    def test_register_creates_user_when_email_is_new(self):
        self.mock_repo.get_by_email.return_value = None
        self.mock_repo.create.return_value = MagicMock(spec=User, id="uuid-1")
        result = self.service.register(RegisterRequest(email="a@b.com", password="pass123"))
        assert "user_id" in result
        self.mock_repo.create.assert_called_once()

    def test_login_raises_on_wrong_password(self):
        user = MagicMock(spec=User, password_hash="$2b$hash")
        self.mock_repo.get_by_email.return_value = user
        with pytest.raises(AuthenticationError):
            self.service.login(LoginRequest(email="a@b.com", password="wrongpass"))
```

### 8.3 Integration Test Example

```python
# backend/tests/integration/test_auth_router.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import create_app
from app.database import Base
from app.dependencies import get_db

SQLITE_TEST_URL = "sqlite:///./test.db"


@pytest.fixture(scope="module")
def test_client():
    engine = create_engine(SQLITE_TEST_URL, connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    app = create_app()

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


def test_register_and_login(test_client):
    # Register
    resp = test_client.post("/api/v1/auth/register",
                            json={"email": "test@legal.ai", "password": "secure123"})
    assert resp.status_code == 201
    assert "user_id" in resp.json()

    # Duplicate registration
    resp = test_client.post("/api/v1/auth/register",
                            json={"email": "test@legal.ai", "password": "secure123"})
    assert resp.status_code == 400

    # Login with correct credentials
    resp = test_client.post("/api/v1/auth/login",
                            json={"email": "test@legal.ai", "password": "secure123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    # Login with wrong password
    resp = test_client.post("/api/v1/auth/login",
                            json={"email": "test@legal.ai", "password": "wrongpass"})
    assert resp.status_code == 401
```

---

## 9. Security Best Practices

### 9.1 Authentication Security Checklist

```python
# backend/app/utils/security.py

# ✅ bcrypt with default cost factor (12) — resistant to brute force
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ✅ 24-hour JWT expiry — short enough to limit exposure
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ✅ SECRET_KEY must be ≥ 32 random characters — enforce at startup
class Settings(BaseSettings):
    SECRET_KEY: str

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v
```

### 9.2 File Upload Security

```python
# In DocumentService.upload_document — enforce before touching the file
ALLOWED_EXTENSIONS = ProcessorRegistry.supported_extensions()   # {".pdf", ".txt", ".md", ".docx"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

# ✅ Validate extension against whitelist
ext = Path(file.filename).suffix.lower()
if ext not in ALLOWED_EXTENSIONS:
    raise UnsupportedFileTypeError(ext, ALLOWED_EXTENSIONS)

# ✅ Read entire content before saving — enforce size limit in memory
content = await file.read()
if len(content) > MAX_BYTES:
    raise FileSizeLimitError(len(content), MAX_BYTES)

# ✅ Store files under user-scoped directory using UUID filename (not original name)
safe_name = f"{doc_id}{ext}"                          # UUID, not user-supplied name
upload_dir = Path(settings.UPLOAD_DIR) / user_id      # Scoped to user
upload_dir.mkdir(parents=True, exist_ok=True)
(upload_dir / safe_name).write_bytes(content)
```

### 9.3 Vector Search Scoping

```python
# ✅ ALWAYS scope ChromaDB queries to user_id + document_ids
# Without this, users could query other users' embedded documents.
where_filter = {
    "$and": [
        {"user_id":     {"$eq": user_id}},
        {"document_id": {"$in": document_ids}},
    ]
}
```

---

## 10. Project File Structure (Canonical)

The final, SE-compliant file structure after applying all patterns:

```
Legal-Ai-Assistant/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               ← App factory + exception handler registration
│   │   ├── config.py             ← Pydantic Settings with validation
│   │   ├── database.py           ← SQLAlchemy engine + Base + init_db
│   │   ├── dependencies.py       ← FastAPI Depends: get_db, get_current_user
│   │   ├── exceptions.py         ← Domain exception hierarchy   [NEW]
│   │   │
│   │   ├── ai/                   ← AI/RAG Layer (pure, no HTTP)
│   │   │   ├── __init__.py
│   │   │   ├── embedder.py       ← Embedder class + get_embedding_model() singleton
│   │   │   ├── llm_factory.py    ← LLMFactory + get_llm() singleton  [NEW]
│   │   │   ├── vector_store.py   ← VectorStoreService (add/search/delete)
│   │   │   ├── prompts.py        ← LEGAL_SYSTEM_PROMPT + build_context_block
│   │   │   ├── chain.py          ← ChainExecutor (LangChain LCEL)
│   │   │   └── rag_pipeline.py   ← RAGPipeline orchestrator + RAGResult  [NEW]
│   │   │
│   │   ├── models/               ← SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   └── chat.py
│   │   │
│   │   ├── schemas/              ← Pydantic request/response DTOs
│   │   │   ├── __init__.py
│   │   │   ├── auth_schemas.py
│   │   │   ├── document_schemas.py
│   │   │   └── chat_schemas.py
│   │   │
│   │   ├── repositories/         ← Repository Pattern layer  [NEW]
│   │   │   ├── __init__.py
│   │   │   ├── base_repository.py
│   │   │   ├── user_repository.py
│   │   │   ├── document_repository.py
│   │   │   └── chat_repository.py
│   │   │
│   │   ├── services/             ← Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py
│   │   │   ├── chat_service.py
│   │   │   └── rag_service.py    ← Thin wrapper; delegates to RAGPipeline
│   │   │
│   │   ├── routers/              ← HTTP routing only (no business logic)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   └── chat.py
│   │   │
│   │   └── utils/                ← Shared utilities
│   │       ├── __init__.py
│   │       ├── security.py       ← bcrypt + JWT
│   │       ├── text_models.py    ← PageText, ProcessedChunk NamedTuples  [NEW]
│   │       ├── extractors.py     ← Strategy Pattern: per-type extractors  [NEW]
│   │       └── document_processor.py  ← Orchestrates extraction + chunking [NEW]
│   │
│   ├── tests/                    ← Test suite  [NEW]
│   │   ├── __init__.py
│   │   ├── unit/
│   │   │   ├── test_auth_service.py
│   │   │   ├── test_document_processor.py
│   │   │   └── test_rag_pipeline.py
│   │   └── integration/
│   │       ├── test_auth_router.py
│   │       ├── test_documents_router.py
│   │       └── test_chat_router.py
│   │
│   ├── evaluate.py               ← Phase 5 evaluation script
│   ├── uploads/
│   ├── chroma_store/
│   ├── .env
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── api/                  ← Pure API functions (no state, no side effects)
        │   ├── client.ts         ← Singleton Axios instance
        │   ├── auth.api.ts
        │   ├── documents.api.ts
        │   └── chat.api.ts
        │
        ├── hooks/                ← Custom hooks (logic extraction)  [NEW]
        │   ├── useDocuments.ts
        │   └── useChat.ts
        │
        ├── context/              ← React Context (global state)
        │   ├── AuthContext.tsx
        │   └── ChatContext.tsx
        │
        ├── components/
        │   ├── ui/               ← Reusable primitives (Button, Input)
        │   ├── documents/        ← Document-domain components
        │   ├── chat/             ← Chat-domain components
        │   └── ErrorBoundary.tsx ← Global error boundary  [NEW]
        │
        ├── pages/                ← Route-level components (consume hooks, render only)
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DocumentsPage.tsx
        │   ├── ChatPage.tsx
        │   └── HistoryPage.tsx
        │
        ├── types/                ← TypeScript interfaces
        │   ├── auth.types.ts
        │   ├── document.types.ts
        │   └── chat.types.ts
        │
        ├── App.tsx
        ├── router.tsx
        └── main.tsx
```

---

## Quick Reference: Pattern → Location Mapping

| Design Pattern | Where Applied | File(s) |
|---|---|---|
| **Layered Architecture** | Entire backend | `routers/` → `services/` → `repositories/` → `models/` |
| **Repository** | Data access | `repositories/base_repository.py`, `*_repository.py` |
| **Factory** | LLM provider selection | `ai/llm_factory.py` |
| **Singleton** | Model/client caching | `ai/embedder.py`, `ai/llm_factory.py`, `ai/vector_store.py` |
| **Strategy** | Document extraction | `utils/extractors.py`, `utils/document_processor.py` |
| **Pipeline** | RAG execution | `ai/rag_pipeline.py` |
| **Value Object** | RAG result | `RAGResult` dataclass in `ai/rag_pipeline.py` |
| **Custom Exception Hierarchy** | Domain errors | `exceptions.py` |
| **Global Exception Handler** | HTTP error mapping | `main.py` → `register_exception_handlers` |
| **Facade** | API client | `api/client.ts` |
| **Custom Hook** | UI state/logic separation | `hooks/useDocuments.ts`, `hooks/useChat.ts` |
| **Error Boundary** | Frontend error containment | `components/ErrorBoundary.tsx` |

---

*Legal AI Assistant — SE Best Practices Guide*
*Stack: FastAPI · SQLite · ChromaDB · BAAI/bge-base-en-v1.5 · LangChain LCEL · React 18 · TypeScript · TailwindCSS*
*LLM: openai/gpt-oss-120b via OpenRouter (free) · Optional: Ollama llama3.2:3b*
