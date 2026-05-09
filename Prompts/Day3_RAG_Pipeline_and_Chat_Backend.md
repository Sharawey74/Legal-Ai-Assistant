# DAY 3 PROMPT
## RAG Pipeline, LLM Integration, and Chat Backend

---

### CONTEXT

Days 1 and 2 are complete. Documents are uploaded, chunked, embedded, and stored in ChromaDB. Today you build the full RAG pipeline using LangChain (LCEL simple chain), connect to the LLM (OpenRouter `openai/gpt-oss-120b` or Ollama `llama3.2:3b`), implement citation extraction, and build all chat backend endpoints. Latency is instrumented from Day 3 onward.

---

### TASK 1 — Add LLM Dependencies

**Append to `backend\requirements.txt`:**
```
langchain==0.2.6
langchain-core==0.2.10
langchain-openai==0.1.14
langchain-ollama==0.1.1
openai==1.35.3
```

Run:
```bash
pip install -r requirements.txt
```

---

### TASK 2 — Implement the LLM Client

**File: `backend\app\ai\llm_client.py`**

```python
from functools import lru_cache
from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings


@lru_cache(maxsize=1)
def get_llm() -> BaseChatModel:
    """
    Returns the configured LLM. Cached after first call.

    LLM_PROVIDER=openrouter  → uses OpenRouter API (openai/gpt-oss-120b, free)
    LLM_PROVIDER=ollama      → uses local Ollama (llama3.2:3b)
    """
    if settings.LLM_PROVIDER == "openrouter":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.OPENROUTER_MODEL,     # openai/gpt-oss-120b
            temperature=0.1,                      # low temperature for factual legal answers
            max_tokens=1024,
        )
    else:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,          # llama3.2:3b
            temperature=0.1,
        )
```

> **API Key note:** Set `OPENROUTER_API_KEY` in `backend\.env`. Get a free key at `openrouter.ai`. If you prefer fully local and have Ollama installed with `llama3.2:3b`, set `LLM_PROVIDER=ollama` instead.

---

### TASK 3 — Implement Prompts

**File: `backend\app\ai\prompts.py`**

```python
from langchain_core.prompts import ChatPromptTemplate

SYSTEM_PROMPT = """You are a legal research assistant. Your role is to help users \
understand legal documents they have uploaded.

STRICT RULES:
1. Answer ONLY using the document excerpts provided below.
2. Cite every factual claim using the format: [Doc: <filename>, Page: <N>]
3. If the answer is not found in the excerpts, respond exactly:
   "I could not find relevant information in the provided documents for this question."
4. Never invent legal citations, case names, statutes, or facts not present in the excerpts.
5. Keep answers structured and concise.

DISCLAIMER: This tool is for legal research only. Always consult a licensed attorney \
for legal advice."""


def build_rag_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human",
         "Document Excerpts:\n{context}\n\n"
         "Question: {question}\n\n"
         "Provide a clear answer with inline citations [Doc: filename, Page: N] "
         "for every factual claim."),
    ])


def build_context_block(chunks: list[dict]) -> str:
    """Format retrieved chunks into a numbered context block for the prompt."""
    lines = []
    for i, chunk in enumerate(chunks, 1):
        lines.append(
            f"[{i}] [Doc: {chunk['filename']}, Page: {chunk['page_number']}]\n"
            f"{chunk['text']}"
        )
    return "\n\n".join(lines)
```

---

### TASK 4 — Implement the RAG Chain

**File: `backend\app\ai\chain.py`**

```python
import time
import logging
from langchain_core.output_parsers import StrOutputParser
from app.ai.prompts import build_rag_prompt, build_context_block
from app.ai.llm_client import get_llm

logger = logging.getLogger(__name__)


def run_rag_chain(query: str, chunks: list[dict]) -> dict:
    """
    Execute the RAG pipeline:
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
    llm     = get_llm()
    chain   = prompt | llm | StrOutputParser()

    answer = chain.invoke({"context": context, "question": query})

    latency_ms = int((time.perf_counter() - t_start) * 1000)

    # Citations are derived from retrieved chunks — not parsed from LLM output.
    # This guarantees citation accuracy regardless of LLM output formatting.
    citations = [
        {
            "document_name": c["filename"],
            "page_number":   c["page_number"],
            "excerpt":       c["text"][:300].strip(),   # first 300 chars as preview
        }
        for c in chunks
    ]

    logger.info(f"RAG chain completed: latency={latency_ms}ms | chunks={len(chunks)}")
    return {"answer": answer, "citations": citations, "latency_ms": latency_ms}
```

---

### TASK 5 — Implement the RAG Service

**File: `backend\app\services\rag_service.py`**

```python
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
        top_k: int = 5,
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
        result = run_rag_chain(query=query, chunks=chunks)
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
```

---

### TASK 6 — Add Chat Models and Schemas

**File: `backend\app\models\chat.py`**

```python
import uuid, json
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title:        Mapped[str]      = mapped_column(String(255), default="New Chat")
    document_ids: Mapped[str]      = mapped_column(Text, default="[]")   # JSON string
    created_at:   Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def get_document_ids(self) -> list[str]:
        return json.loads(self.document_ids)

    def set_document_ids(self, ids: list[str]) -> None:
        self.document_ids = json.dumps(ids)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role:       Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant
    content:    Mapped[str] = mapped_column(Text, nullable=False)
    citations:  Mapped[str] = mapped_column(Text, default="[]")          # JSON string
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def get_citations(self) -> list[dict]:
        return json.loads(self.citations)

    def set_citations(self, citations: list[dict]) -> None:
        self.citations = json.dumps(citations)
```

Update `backend\app\database.py` — add `chat` model import:
```python
def init_db() -> None:
    from app.models import user, document, chat  # noqa: F401
    Base.metadata.create_all(bind=engine)
```

---

**File: `backend\app\schemas\chat_schemas.py`**

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class Citation(BaseModel):
    document_name: str
    page_number:   int
    excerpt:       str


class CreateSessionRequest(BaseModel):
    document_ids: list[str]
    title:        Optional[str] = None


class SessionResponse(BaseModel):
    id:           str
    title:        str
    document_ids: list[str]
    created_at:   datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id:         str
    session_id: str
    role:       str
    content:    str
    citations:  list[Citation]
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

### TASK 7 — Implement the Chat Service

**File: `backend\app\services\chat_service.py`**

```python
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat_schemas import CreateSessionRequest, SendMessageRequest, MessageResponse
from app.services.rag_service import RAGService


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.rag = RAGService()

    def create_session(self, request: CreateSessionRequest, user_id: str) -> ChatSession:
        if not request.document_ids:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                detail="At least one document must be selected")
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=request.title or "New Chat",
        )
        session.set_document_ids(request.document_ids)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def list_sessions(self, user_id: str) -> list[ChatSession]:
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
            .all()
        )

    def delete_session(self, session_id: str, user_id: str) -> None:
        session = self._get_session(session_id, user_id)
        self.db.delete(session)
        self.db.commit()

    def get_messages(self, session_id: str, user_id: str) -> list[ChatMessage]:
        self._get_session(session_id, user_id)    # validates ownership
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
            .all()
        )

    def handle_message(
        self,
        session_id: str,
        request: SendMessageRequest,
        user_id: str,
    ) -> MessageResponse:
        session = self._get_session(session_id, user_id)
        document_ids = session.get_document_ids()

        # 1. Save the user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.content,
        )
        self.db.add(user_msg)

        # Update session title to first message if still default
        if session.title == "New Chat":
            session.title = request.content[:80]
        self.db.commit()

        # 2. Run RAG pipeline
        result = self.rag.run(
            query=request.content,
            user_id=user_id,
            document_ids=document_ids,
        )

        # 3. Save assistant response
        assistant_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="assistant",
            content=result["answer"],
        )
        assistant_msg.set_citations(result["citations"])
        self.db.add(assistant_msg)
        self.db.commit()
        self.db.refresh(assistant_msg)

        return MessageResponse(
            id=assistant_msg.id,
            session_id=session_id,
            role="assistant",
            content=assistant_msg.content,
            citations=assistant_msg.get_citations(),
            created_at=assistant_msg.created_at,
        )

    def _get_session(self, session_id: str, user_id: str) -> ChatSession:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat session not found")
        return session
```

---

### TASK 8 — Implement the Chat Router

**Replace `backend\app\routers\chat.py`:**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.chat_schemas import (
    CreateSessionRequest, SessionResponse,
    SendMessageRequest, MessageResponse,
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/sessions", response_model=SessionResponse, status_code=201)
def create_session(
    body: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = ChatService(db).create_session(body, current_user.id)
    return SessionResponse(
        id=session.id, title=session.title,
        document_ids=session.get_document_ids(), created_at=session.created_at,
    )


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = ChatService(db).list_sessions(current_user.id)
    return [
        SessionResponse(id=s.id, title=s.title,
                        document_ids=s.get_document_ids(), created_at=s.created_at)
        for s in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ChatService(db).delete_session(session_id, current_user.id)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    messages = ChatService(db).get_messages(session_id, current_user.id)
    return [
        MessageResponse(
            id=m.id, session_id=m.session_id, role=m.role,
            content=m.content, citations=m.get_citations(), created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
def send_message(
    session_id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ChatService(db).handle_message(session_id, body, current_user.id)
```

---

### DAY 3 END-OF-DAY VERIFICATION CHECKLIST

- [ ] Backend restarts cleanly — `chat_sessions` and `chat_messages` tables created
- [ ] `POST /api/v1/chat/sessions` with `{"document_ids": ["<your-doc-id>"]}` returns a session object
- [ ] `POST /api/v1/chat/sessions/{id}/messages` with `{"content": "What is the force majeure clause?"}` returns an answer with at least one citation
- [ ] Answer contains `[Doc:` citation inline — LLM followed the prompt instructions
- [ ] `GET /api/v1/chat/sessions/{id}/messages` returns both the user message and assistant response
- [ ] Backend console shows latency log: `RAG pipeline: embed=Xms | retrieve=Xms | generate=Xms | total=Xms`
- [ ] `GET /api/v1/chat/sessions` returns the created session with updated title
- [ ] `DELETE /api/v1/chat/sessions/{id}` returns `204` and session disappears from list
- [ ] Test with `LLM_PROVIDER=openrouter` — receives LLM response from OpenRouter API
- [ ] (Optional) Test with `LLM_PROVIDER=ollama` — receives response from local `llama3.2:3b`
