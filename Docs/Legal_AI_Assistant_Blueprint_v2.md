# AI-Powered Legal Research Assistant
## Revised Engineering Blueprint — v2 (Deadline-Optimized)

> **Phase 1 (Now — 5 Days):** Core working system, no Docker, no deployment  
> **Phase 2 (Later):** Docker, deployment, advanced features, production hardening  
> **Stack (Phase 1):** React · TailwindCSS · FastAPI · ChromaDB · SQLite · LangChain · Ollama / OpenRouter  
> **Priority:** Simplicity, speed, and a fully demonstrable local system

---

## Phase Split — What's In and What's Out

### ✅ Phase 1 — Build Now (5 Days)

| Area | Decision |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Backend | FastAPI (Python), run locally with `uvicorn` |
| Relational data | **SQLite** via SQLAlchemy — zero setup, no server |
| Vector storage | **ChromaDB** — local file-based, no server, pip install |
| AI pipeline | **LangChain** simple chain — no LangGraph overhead |
| LLM | Ollama (local) or OpenRouter free-tier (cloud) |
| Embeddings | HuggingFace `sentence-transformers` — fully local, free |
| Auth | JWT with bcrypt — simple, no external service |
| PDF processing | PyMuPDF — one pip install |
| Containerization | ❌ Deferred to Phase 2 |
| Deployment | ❌ Deferred to Phase 2 |
| Database migrations | ❌ SQLAlchemy `create_all()` instead of Alembic |
| LangGraph stateful agent | ❌ Deferred to Phase 2 |
| CI/CD | ❌ Deferred to Phase 2 |

### 🔜 Phase 2 — Build Later

| Area | Upgrade Path |
|---|---|
| SQLite → PostgreSQL + pgvector | Better vector search, concurrent users |
| ChromaDB → pgvector | Single unified data store |
| LangChain chain → LangGraph | Stateful multi-step agent, memory |
| Local run → Docker Compose | Reproducible environment across machines |
| Docker → VPS deployment | Public URL, production hosting |
| Alembic migrations | Schema versioning for long-term maintenance |
| Streaming LLM responses | Real-time character-by-character output |
| Background task queue | Async PDF processing for large files |
| RAGAS automated evaluation | Automated faithfulness scoring |

---

## Section 1 — Project Scope & Architecture

### 1.1 What the System Does

The assistant allows a user to upload legal PDF documents, ask natural-language questions about them, and receive answers that are grounded in the uploaded text — every answer cites the source document and page. Chat history is preserved per session.

### 1.2 What the System Does NOT Do

- Give legal advice or make legal decisions
- Access external legal databases (Westlaw, LexisNexis)
- Run autonomously or plan multi-step tasks on its own
- Function as a production SaaS (Phase 1 is local-only)

### 1.3 Simplified Architecture — Phase 1

```
┌─────────────────────────────────────────────────────────┐
│                  BROWSER (React + TailwindCSS)          │
│  Pages: Login · Documents · Chat · History              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST (JSON)
                         ▼
┌─────────────────────────────────────────────────────────┐
│             FASTAPI BACKEND (Python)                    │
│  Routers: /auth  /documents  /chat                      │
│  Services: AuthService · DocumentService · ChatService  │
│  RAG Chain: Embed → Retrieve → Generate → Cite         │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
   ┌───────────▼──────────┐   ┌──────────▼────────────┐
   │  SQLite (via         │   │  ChromaDB             │
   │  SQLAlchemy)         │   │  (local file-based    │
   │                      │   │   vector store)       │
   │  · users             │   │                       │
   │  · documents         │   │  · text chunks        │
   │  · chat_sessions     │   │  · embeddings         │
   │  · chat_messages     │   │  · metadata           │
   └──────────────────────┘   └───────────────────────┘
               │
   ┌───────────▼──────────────────────────────────────┐
   │           MODEL LAYER                            │
   │  Embeddings: HuggingFace sentence-transformers   │
   │  LLM:  Ollama (local)  OR  OpenRouter (cloud)   │
   └──────────────────────────────────────────────────┘
```

### 1.4 Data Flow — Query Path

```
User types question
  → POST /chat/sessions/{id}/messages
  → JWT validated
  → query embedded with HuggingFace model (local)
  → ChromaDB similarity search (top-5 chunks, filtered by document_ids)
  → chunks + query injected into prompt template
  → LLM generates cited answer (Ollama or OpenRouter)
  → answer + citations saved to SQLite (chat_messages)
  → JSON response returned to React frontend
  → ChatWindow renders answer, CitationPanel renders sources
```

### 1.5 Data Flow — Upload Path

```
User selects PDF
  → POST /documents (multipart form)
  → JWT validated, file type + size checked
  → PyMuPDF extracts text page by page
  → RecursiveCharacterTextSplitter: 800 tokens, 100 overlap
  → HuggingFace model embeds each chunk locally
  → ChromaDB stores chunks + embeddings + metadata
  → SQLite document row updated: status = "ready"
  → DocumentCard updates in UI
```

---

## Section 2 — Tech Stack & Model Recommendations

### 2.1 Phase 1 Tech Stack

| Layer | Technology | Why Chosen |
|---|---|---|
| Frontend framework | React 18 + TypeScript | Industry standard, typed |
| Frontend build tool | Vite | Instant HMR, zero config |
| Frontend styling | **TailwindCSS** | Utility-first, no separate CSS files, fast to write |
| Backend framework | FastAPI | Async, auto-docs, Pydantic native |
| Relational database | **SQLite + SQLAlchemy** | Zero server setup, file-based, sufficient for 1 user |
| Vector store | **ChromaDB** | pip install + 3 lines of code, local file, no server |
| Embeddings | **HuggingFace sentence-transformers** | Free, fully local, no API key |
| LLM (local option) | **Ollama** | Free, private, offline-capable |
| LLM (cloud option) | **OpenRouter free tier** | Better output quality, no cost |
| PDF processing | PyMuPDF (fitz) | Best text extraction for legal PDFs |
| AI chain | **LangChain** (simple chain) | Mature, well-documented, simpler than LangGraph |
| Auth | python-jose + passlib (bcrypt) | Minimal, proven JWT implementation |
| State management | **React Context + useState** | No extra library; Zustand deferred |
| HTTP client | Axios | Typed, interceptor support |

### 2.2 Why SQLite over PostgreSQL (Phase 1)

PostgreSQL requires a running server process (or Docker). SQLite is a file — it starts the moment `uvicorn` starts, with zero configuration. For a single-developer local system handling one user at a time, SQLite + SQLAlchemy is functionally identical to PostgreSQL. The SQLAlchemy ORM layer means the upgrade path to PostgreSQL in Phase 2 requires changing **one line** (the connection string) with no other code changes.

```python
# Phase 1 — SQLite (no server needed)
DATABASE_URL = "sqlite:///./legal_assistant.db"

# Phase 2 — PostgreSQL (change this one line)
DATABASE_URL = "postgresql://user:pass@localhost:5432/legaldb"
```

### 2.3 Why ChromaDB over pgvector (Phase 1)

pgvector requires PostgreSQL to be running (which we've deferred). ChromaDB is a standalone Python library that persists embeddings to a local folder.

```python
# Phase 1 — ChromaDB (zero setup)
import chromadb
client = chromadb.PersistentClient(path="./chroma_store")
collection = client.get_or_create_collection("legal_chunks")

# Store chunks
collection.add(documents=[text], embeddings=[vector], metadatas=[meta], ids=[id])

# Query
results = collection.query(query_embeddings=[q_vec], n_results=5,
                           where={"user_id": current_user_id})
```

Phase 2 upgrade: swap ChromaDB calls for pgvector SQL queries — the LangChain retriever abstraction keeps this change isolated to one file.

### 2.4 Why LangChain Chain over LangGraph (Phase 1)

LangGraph adds stateful graph complexity that is unnecessary for a fixed 3-step pipeline. A LangChain `RunnableSequence` (LCEL) achieves the same result in far fewer lines:

```python
# Phase 1 — LangChain LCEL simple chain
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt_template
    | llm
    | StrOutputParser()
)

answer = rag_chain.invoke(user_query)
```

Phase 2 upgrade: wrap this chain in a LangGraph node to add memory, multi-step reasoning, or conditional retrieval.

---

### 2.5 Free LLM Model Recommendations

#### OpenRouter — Free Tier Models

All models below are available at `openrouter.ai` with no cost on the free tier. Use the `openai`-compatible client:

```python
from openai import OpenAI
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
```

| Model ID (pass to `model=`) | Context | Strengths | Best For |
|---|---|---|---|
| `mistralai/mistral-7b-instruct:free` | 32K | Strong instruction following, structured output | Primary recommendation — best balance |
| `meta-llama/llama-3.1-8b-instruct:free` | 128K | Long context, very coherent answers | Long contract analysis |
| `google/gemma-2-9b-it:free` | 8K | Clean, concise answers | Short Q&A, clause extraction |
| `microsoft/phi-3-mini-128k-instruct:free` | 128K | Lightweight, fast, good for structured tasks | Speed-critical queries |
| `deepseek/deepseek-r1:free` | 64K | Strong reasoning, chain-of-thought | Complex multi-issue legal questions |
| `qwen/qwen-2.5-7b-instruct:free` | 128K | Multilingual, good instruction following | Multi-language documents |
| `nousresearch/hermes-3-llama-3.1-8b:free` | 128K | Good at following explicit output formats | Citation formatting |

> **Phase 1 Primary Recommendation:** `mistralai/mistral-7b-instruct:free`  
> **Phase 1 Long-Context Fallback:** `meta-llama/llama-3.1-8b-instruct:free`  
> **Phase 1 Reasoning Fallback:** `deepseek/deepseek-r1:free`

---

#### Ollama — Local Models (No API Key, Fully Offline)

Pull with `ollama pull <model_name>` before starting the backend.

| Model Name | Size | RAM Needed | Strengths | Best For |
|---|---|---|---|---|
| `llama3.2:3b` | 2 GB | 4 GB | Very fast, lightweight | Development, quick testing |
| `llama3.1:8b` | 4.7 GB | 8 GB | Good quality, long context | Phase 1 primary local model |
| `mistral:7b` | 4.1 GB | 8 GB | Strong instruction following | Legal clause extraction |
| `phi3:mini` | 2.2 GB | 4 GB | Extremely fast, structured output | Low-RAM machines |
| `gemma2:2b` | 1.6 GB | 3 GB | Smallest usable model | Very constrained hardware |
| `qwen2.5:7b` | 4.4 GB | 8 GB | Strong reasoning, long context | Complex legal questions |
| `deepseek-r1:7b` | 4.7 GB | 8 GB | Best reasoning for local | Multi-step legal analysis |

> **Phase 1 Primary (≥ 8 GB RAM):** `llama3.1:8b` or `mistral:7b`  
> **Phase 1 Low-RAM (4–6 GB RAM):** `phi3:mini` or `llama3.2:3b`  
> **Phase 1 Best Reasoning:** `deepseek-r1:7b`

**LLM Provider Toggle (one config line):**
```python
# config.py / .env
LLM_PROVIDER = "openrouter"   # or "ollama"
OLLAMA_MODEL  = "llama3.1:8b"
OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free"
```

---

### 2.6 Embedding Model Recommendations — HuggingFace (All Free, All Local)

Embeddings run entirely on the local machine via `sentence-transformers`. No API key, no cost, no internet connection required after initial model download.

```python
pip install sentence-transformers
```

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("BAAI/bge-base-en-v1.5")
embedding = model.encode("Does COVID-19 qualify as force majeure?").tolist()
```

| Model | Dimension | Size | Speed | Quality | Best For |
|---|---|---|---|---|---|
| `BAAI/bge-small-en-v1.5` | 384 | 130 MB | ⚡ Very fast | Good | Low-RAM, fast iteration |
| **`BAAI/bge-base-en-v1.5`** | **768** | **430 MB** | **Fast** | **Very good** | **Phase 1 Primary — best balance** |
| `BAAI/bge-large-en-v1.5` | 1024 | 1.3 GB | Moderate | Excellent | Higher quality at memory cost |
| `sentence-transformers/all-MiniLM-L6-v2` | 384 | 90 MB | ⚡ Fastest | Good | Minimum-spec machines |
| `sentence-transformers/all-mpnet-base-v2` | 768 | 420 MB | Moderate | Very good | Alternative to bge-base |
| `nomic-ai/nomic-embed-text-v1` | 768 | 550 MB | Fast | Excellent | Long legal documents (8K context) |
| `thenlper/gte-large` | 1024 | 1.3 GB | Moderate | Excellent | Best retrieval accuracy (high RAM) |

> **Phase 1 Recommended:** `BAAI/bge-base-en-v1.5` — 768-dim, good legal text retrieval, runs on 4 GB RAM  
> **Phase 1 Low-RAM:** `sentence-transformers/all-MiniLM-L6-v2` — 90 MB, fast, good enough  
> **Phase 1 Best Quality:** `nomic-ai/nomic-embed-text-v1` — handles full legal paragraphs with 8K token context window

**Important:** The embedding model used during ingestion and during query must be **the same model**. Set it once in config and never change it mid-project without re-ingesting all documents.

```python
# config.py
EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"  # set once, never change mid-project
```

---

## Section 3 — System Design (Simplified)

### 3.1 Folder Structure

```
legal-ai-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, router registration, CORS
│   │   ├── config.py            # Settings (reads .env)
│   │   ├── database.py          # SQLAlchemy engine + session (SQLite)
│   │   ├── dependencies.py      # get_db(), get_current_user()
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /auth/register, POST /auth/login
│   │   │   ├── documents.py     # GET/POST/DELETE /documents
│   │   │   └── chat.py          # sessions + messages endpoints
│   │   │
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py   # upload → extract → chunk → embed → store
│   │   │   ├── chat_service.py       # session management + calling RAG
│   │   │   └── rag_service.py        # embed query → ChromaDB search → LLM → cite
│   │   │
│   │   ├── models/              # SQLAlchemy ORM (SQLite tables)
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   └── chat.py
│   │   │
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   │   ├── auth_schemas.py
│   │   │   ├── document_schemas.py
│   │   │   └── chat_schemas.py
│   │   │
│   │   ├── ai/
│   │   │   ├── embedder.py      # HuggingFace SentenceTransformer wrapper
│   │   │   ├── vector_store.py  # ChromaDB client + collection operations
│   │   │   ├── chain.py         # LangChain LCEL chain definition
│   │   │   ├── llm_client.py    # Ollama / OpenRouter toggle
│   │   │   └── prompts.py       # System prompt + user prompt templates
│   │   │
│   │   └── utils/
│   │       ├── pdf_processor.py # PyMuPDF extraction + chunking
│   │       └── security.py      # bcrypt + JWT
│   │
│   ├── uploads/                 # Uploaded PDFs stored here (local filesystem)
│   ├── chroma_store/            # ChromaDB persisted vector data (auto-created)
│   ├── legal_assistant.db       # SQLite database file (auto-created)
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts        # Axios instance + JWT interceptor
│   │   │   ├── auth.api.ts
│   │   │   ├── documents.api.ts
│   │   │   └── chat.api.ts
│   │   ├── components/
│   │   │   ├── ui/              # Button, Input, Modal, Spinner, Badge
│   │   │   ├── layout/          # AppLayout, Sidebar, Topbar
│   │   │   ├── chat/            # ChatWindow, MessageBubble, CitationPanel
│   │   │   └── documents/       # DocumentCard, UploadDropzone
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DocumentsPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   ├── context/             # React Context (replaces Zustand for Phase 1)
│   │   │   ├── AuthContext.tsx
│   │   │   └── ChatContext.tsx
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── router.tsx
│   │   └── index.css            # @tailwind base/components/utilities only
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env                     # VITE_API_URL=http://localhost:8000
│
├── .env.example
└── README.md
```

> **No `docker-compose.yml` in Phase 1** — every service starts with a single command.

### 3.2 Database Schema (SQLite — No Migration Tool)

Tables are created automatically on first startup via `Base.metadata.create_all(engine)`.

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

engine = Base = declarative_base()
engine = create_engine("sqlite:///./legal_assistant.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

# Called once at app startup — creates all tables if they don't exist
def init_db():
    Base.metadata.create_all(bind=engine)
```

```sql
-- Represented as SQLAlchemy models; shown as SQL for clarity

users (
    id          TEXT PRIMARY KEY,   -- UUID as string (SQLite has no UUID type)
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
)

documents (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    filename    TEXT NOT NULL,
    file_size   INTEGER,
    page_count  INTEGER,
    status      TEXT DEFAULT 'processing',  -- processing | ready | failed
    created_at  TEXT DEFAULT (datetime('now'))
)

chat_sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    title       TEXT,
    document_ids TEXT,   -- JSON array stored as string e.g. '["id1","id2"]'
    created_at  TEXT DEFAULT (datetime('now'))
)

chat_messages (
    id          TEXT PRIMARY KEY,
    session_id  TEXT REFERENCES chat_sessions(id),
    role        TEXT,   -- 'user' | 'assistant'
    content     TEXT,
    citations   TEXT,   -- JSON array stored as string
    created_at  TEXT DEFAULT (datetime('now'))
)
```

> **Note on `document_ids` and `citations`:** SQLite has no native JSON or array column. Store these as JSON strings and parse in Python. SQLAlchemy's `JSON` column type handles this transparently.

### 3.3 ChromaDB Vector Store Design

ChromaDB collections replace the `chunks` table and the pgvector extension entirely.

```python
# ai/vector_store.py
import chromadb
from chromadb.config import Settings

# PersistentClient saves to disk — survives server restart
chroma_client = chromadb.PersistentClient(path="./chroma_store")

# One shared collection for all users; user isolation via metadata filter
collection = chroma_client.get_or_create_collection(
    name="legal_chunks",
    metadata={"hnsw:space": "cosine"}  # cosine similarity for text
)

def add_chunks(chunks: list[dict], user_id: str, document_id: str):
    collection.add(
        ids=[c["id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        embeddings=[c["embedding"] for c in chunks],
        metadatas=[{
            "user_id": user_id,
            "document_id": document_id,
            "filename": c["filename"],
            "page_number": c["page_number"]
        } for c in chunks]
    )

def search(query_embedding: list[float], user_id: str,
           document_ids: list[str], top_k: int = 5) -> list[dict]:
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={
            "$and": [
                {"user_id": {"$eq": user_id}},
                {"document_id": {"$in": document_ids}}
            ]
        }
    )
    return [
        {
            "text": results["documents"][0][i],
            "filename": results["metadatas"][0][i]["filename"],
            "page_number": results["metadatas"][0][i]["page_number"],
            "distance": results["distances"][0][i]
        }
        for i in range(len(results["documents"][0]))
    ]

def delete_document_chunks(document_id: str):
    collection.delete(where={"document_id": {"$eq": document_id}})
```

### 3.4 RAG Chain (LangChain LCEL — Phase 1)

```python
# ai/chain.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from app.ai.prompts import SYSTEM_PROMPT, build_context_block
from app.ai.llm_client import get_llm

def run_rag(query: str, chunks: list[dict]) -> str:
    """Simple chain: prompt → LLM → string output."""
    context = build_context_block(chunks)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "Document Excerpts:\n{context}\n\nQuestion: {question}")
    ])

    chain = prompt | get_llm() | StrOutputParser()
    return chain.invoke({"context": context, "question": query})
```

```python
# ai/prompts.py
SYSTEM_PROMPT = """
You are a legal research assistant. Answer questions using ONLY the document
excerpts provided. For every claim, cite the source as [Doc: filename, Page: N].
If the answer is not in the excerpts, say so clearly. Never invent legal citations.
This tool is for research only — always recommend consulting a licensed attorney.
"""

def build_context_block(chunks: list[dict]) -> str:
    return "\n\n".join(
        f"[Doc: {c['filename']}, Page: {c['page_number']}]\n{c['text']}"
        for c in chunks
    )
```

```python
# ai/llm_client.py
from app.config import settings

def get_llm():
    if settings.LLM_PROVIDER == "openrouter":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.OPENROUTER_MODEL,  # "mistralai/mistral-7b-instruct:free"
        )
    else:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,       # "llama3.1:8b"
        )
```

### 3.5 TailwindCSS Setup

```bash
# In /frontend
npm create vite@latest . -- --template react-ts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```typescript
// tailwind.config.ts
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:  "#1e40af",
        "primary-hover": "#1d4ed8",
        surface:  "#f8fafc",
        muted:    "#64748b",
        danger:   "#dc2626",
        success:  "#16a34a",
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
    },
  },
  plugins: [],
};
```

```css
/* src/index.css — entire file */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-surface text-slate-900 antialiased font-sans; }
  h1   { @apply text-2xl font-bold text-slate-800; }
  h2   { @apply text-lg font-semibold text-slate-700; }
}
```

All component styling uses utility classes directly in JSX. No CSS Modules, no styled-components, no inline `style={}`.

```tsx
// Example: Button component with Tailwind variants
type Variant = "primary" | "danger" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-primary hover:bg-primary-hover text-white",
  danger:  "bg-danger hover:bg-red-700 text-white",
  ghost:   "bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300",
};

export const Button = ({ variant = "primary", children, ...props }) => (
  <button
    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm
                disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    {...props}
  >
    {children}
  </button>
);
```

### 3.6 Authentication (Simplified)

```python
# utils/security.py
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from app.config import settings

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:       return pwd.hash(password)
def verify_password(plain, hashed) -> bool:    return pwd.verify(plain, hashed)

def create_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode({"sub": user_id, "exp": exp}, settings.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    return payload["sub"]  # returns user_id
```

### 3.7 API Endpoints Reference

```
Auth
  POST  /api/v1/auth/register      { email, password }       → 201
  POST  /api/v1/auth/login         { email, password }       → { access_token }

Documents                            (all require Authorization: Bearer <token>)
  GET   /api/v1/documents                                    → [ Document ]
  POST  /api/v1/documents          multipart PDF             → Document
  DELETE /api/v1/documents/{id}                              → 204

Chat Sessions
  POST  /api/v1/chat/sessions      { document_ids, title? } → Session
  GET   /api/v1/chat/sessions                               → [ Session ]
  DELETE /api/v1/chat/sessions/{id}                         → 204

Chat Messages
  GET   /api/v1/chat/sessions/{id}/messages                 → [ Message ]
  POST  /api/v1/chat/sessions/{id}/messages  { content }    → {
                                                                 role: "assistant",
                                                                 content: string,
                                                                 citations: [{
                                                                   document_name,
                                                                   page_number,
                                                                   excerpt
                                                                 }]
                                                               }
```

### 3.8 Environment Variables (.env)

```bash
# backend/.env
SECRET_KEY=replace-with-a-long-random-string-at-least-32-chars
DATABASE_URL=sqlite:///./legal_assistant.db
CHROMA_PERSIST_PATH=./chroma_store
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
LLM_PROVIDER=openrouter                         # or "ollama"
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
FRONTEND_URL=http://localhost:5173

# frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## Section 4 — 5-Day Implementation Plan (Phase 1)

> No Docker. No deployment. Every service starts with a single terminal command.

### Startup Commands (Phase 1)

```bash
# Terminal 1 — Ollama (if using local LLM)
ollama serve
ollama pull llama3.1:8b
ollama pull nomic-embed-text     # optional, only if not using HuggingFace

# Terminal 2 — Backend
cd backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

No other services needed. SQLite and ChromaDB start automatically with the FastAPI app.

---

### Day 1 — Project Setup + Authentication

**Tasks:**

Backend:
- Create project structure, `requirements.txt`, `.env`
- `database.py`: SQLite engine + `init_db()` called on startup
- `User` SQLAlchemy model + Pydantic schemas
- `security.py`: bcrypt + JWT (hash, verify, create_token, decode_token)
- `auth_service.py`: register (check duplicate email → hash → insert), login (lookup → verify → return token)
- `auth.py` router: `POST /register`, `POST /login`
- `dependencies.py`: `get_db()`, `get_current_user()`
- `main.py`: app factory, CORS (`allow_origins=[FRONTEND_URL]`), router registration, `init_db()` on startup

Frontend:
- Vite + React + TypeScript init, TailwindCSS install + config
- `client.ts`: Axios instance, request interceptor adds `Authorization: Bearer <token>`, response interceptor handles 401 → redirect to `/login`
- `AuthContext.tsx`: `user`, `token`, `login()`, `logout()` — stored in `localStorage`
- `LoginPage.tsx`, `RegisterPage.tsx`: form with email + password, inline validation errors
- `router.tsx`: `ProtectedRoute` wrapper redirects unauthenticated users to `/login`

**End-of-Day Check:** Register → Login → JWT stored → `GET /documents` returns 200 (empty array) → `GET /documents` without token returns 401 ✓

---

### Day 2 — Document Upload + Ingestion Pipeline

**Tasks:**

Backend:
- `requirements.txt` additions: `pymupdf`, `langchain-text-splitters`, `sentence-transformers`, `chromadb`
- `embedder.py`: `SentenceTransformer("BAAI/bge-base-en-v1.5")` — load once on startup, expose `embed(text) → list[float]`
- `vector_store.py`: ChromaDB PersistentClient — `add_chunks()`, `search()`, `delete_document_chunks()`
- `pdf_processor.py`: PyMuPDF page-by-page text extraction + `RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)`
- `document_service.py`: validate (PDF only, ≤ 20 MB) → save to `uploads/` → extract → chunk → embed each chunk → `add_chunks()` to ChromaDB → update SQLite document status to `ready`
- `Document` model + schemas
- `documents.py` router: `POST /documents` (multipart), `GET /documents`, `DELETE /documents/{id}` (+ `delete_document_chunks()`)

Frontend:
- `documents.api.ts`: upload, list, delete typed API functions
- `DocumentsPage.tsx`: full layout with Tailwind
- `UploadDropzone.tsx`: drag-and-drop + file picker, validates PDF MIME type + 20 MB limit client-side, shows progress
- `DocumentCard.tsx`: filename, file size, page count, status badge (`processing` → yellow, `ready` → green, `failed` → red), delete button with confirmation

**End-of-Day Check:** Upload a real legal PDF → status shows `ready` → `chroma_store/` folder exists → `query_collection()` returns chunks manually ✓

---

### Day 3 — RAG Pipeline + Chat Backend

**Tasks:**

Backend:
- `prompts.py`: `SYSTEM_PROMPT` + `build_context_block()` function
- `llm_client.py`: `get_llm()` returns `ChatOpenAI` (OpenRouter) or `ChatOllama` based on `LLM_PROVIDER`
- `chain.py`: LangChain LCEL chain — `prompt | llm | StrOutputParser()`
- `rag_service.py`:
  1. Embed query using `embedder.embed(query)`
  2. `vector_store.search()` — top-5 chunks filtered by `user_id` + `document_ids`
  3. `run_rag(query, chunks)` — invoke LangChain chain
  4. Build citations list from retrieved chunks (not parsed from LLM output)
  5. Return `{"answer": str, "citations": list[dict]}`
- Add latency instrumentation: log embed / retrieve / generate times with `time.perf_counter()`
- `ChatSession` + `ChatMessage` SQLAlchemy models + schemas
- `chat_service.py`: create session, get sessions, delete session, `handle_message()` → calls `rag_service` → saves message + assistant response + citations to SQLite
- `chat.py` router: all session and message endpoints

**End-of-Day Check:** `POST /chat/sessions` → `POST /chat/sessions/{id}/messages` with a legal question → receive answer with citations in JSON → check SQLite `chat_messages` table has both rows ✓

---

### Day 4 — Chat Frontend + Full UI Polish

**Tasks:**

Frontend:
- `ChatContext.tsx`: `sessionId`, `messages`, `selectedDocumentIds` — React Context + useReducer
- `chat.api.ts`: create session, list sessions, get messages, send message
- `ChatPage.tsx`:
  - Left panel (`w-64 border-r`): document multi-selector with checkboxes, "New Chat" button
  - Center panel (`flex-1`): `ChatWindow` with scrollable message list, sticky input bar
  - Right panel (`w-80 border-l`): `CitationPanel` — collapsible, shows source excerpts for last answer
- `MessageBubble.tsx`: user messages right-aligned (blue bg), assistant messages left-aligned (white card), "View Sources" button on assistant messages
- `CitationPanel.tsx`: list of citation cards — filename, page badge, excerpt text (300 chars)
- Input bar: textarea (auto-resize), send button disabled while loading, `⌘+Enter` to send
- `HistoryPage.tsx`: list of past sessions (first message as title, date), click → navigate to `/chat/:sessionId`, delete session with confirmation
- Tailwind polish pass across all pages: consistent spacing (`p-4`, `gap-3`), hover states, focus rings, responsive sidebar (collapse on small screens), loading skeletons during API calls, empty state illustrations

**End-of-Day Check:** Full user flow in browser — login → upload PDF → start chat → ask 3 legal questions → view citations in right panel → check history page shows session → reload page → chat history persists ✓

---

### Day 5 — Evaluation (Phase 5 + Phase 6)

**Tasks:**

Phase 5 — Measure all 4 metrics across 10 legal test scenarios:

```python
# Quick evaluation script: backend/evaluate.py
import time, json, requests

BASE = "http://localhost:8000/api/v1"
TOKEN = "..."  # log in first and paste token

CASES = [
    {"q": "Does COVID-19 qualify as force majeure under a supply contract clause?",        "doc": "case1.pdf"},
    {"q": "Enforceability of non-compete under California Business & Professions Code?",   "doc": "case2.pdf"},
    {"q": "GDPR Article 32 security obligations for cloud data processors?",               "doc": "case3.pdf"},
    {"q": "IP assignment enforceability for inventions developed on personal time?",       "doc": "case4.pdf"},
    {"q": "Liquidated damages vs unenforceable penalty clause — genuine pre-estimate?",    "doc": "case5.pdf"},
    {"q": "Auto-renewal clause enforceability — conspicuous notice requirement?",          "doc": "case6.pdf"},
    {"q": "Whistleblower retaliation wrongful termination Sarbanes-Oxley?",                "doc": "case7.pdf"},
    {"q": "Construction change order validity — verbal instructions scope dispute?",       "doc": "case8.pdf"},
    {"q": "Trade secret misappropriation customer list Defend Trade Secrets Act?",         "doc": "case9.pdf"},
    {"q": "Mandatory arbitration class action waiver unconscionability?",                  "doc": "case10.pdf"},
]

for i, case in enumerate(CASES, 1):
    t0 = time.perf_counter()
    resp = requests.post(f"{BASE}/chat/sessions/{{session_id}}/messages",
                         json={"content": case["q"]},
                         headers={"Authorization": f"Bearer {TOKEN}"})
    latency = time.perf_counter() - t0
    data = resp.json()
    print(f"Case {i}: latency={latency:.1f}s | citations={len(data['citations'])} | tokens_approx={len(data['content'].split())}")
```

Record manually in the evaluation table:

| # | Scenario | Faithfulness (≥0.90) | Task Success (✓/✗) | Latency s (< 20s) | Citations Present | Cost ($) |
|---|---|---|---|---|---|---|
| 1 | Force Majeure | | | | | |
| 2 | Non-Compete CA | | | | | |
| 3 | GDPR Breach | | | | | |
| 4 | IP Ownership | | | | | |
| 5 | Liquidated Damages | | | | | |
| 6 | SaaS Auto-Renewal | | | | | |
| 7 | Whistleblower | | | | | |
| 8 | Construction Scope | | | | | |
| 9 | Trade Secrets | | | | | |
| 10 | Arbitration | | | | | |
| **Result** | | **avg ≥ 0.90** | **≥ 8/10** | **all < 20s** | **all ≥ 1** | **< $0.01** |

Phase 6 — Model Selection (external benchmarks, no coding required):

1. **HELM** (`crfm.stanford.edu/helm`) → filter LegalBench → record exact_match + F1
2. **Artificial Analysis** (`artificialanalysis.ai`) → record: Quality Index (> 70), Speed (> 50 tok/s), Context (> 32K), Cost/1M input (< $10), TTFT (< 2s)
3. **LLM Arena** (`lmarena.ai`) → record Elo + instruction-following rank → run 5 personal battle comparisons with real test queries

Complete the model selection table and write a 2-sentence justification for the chosen model.

---

### 5-Day Summary

| Day | Focus | No-Docker Startup | End-of-Day Deliverable |
|---|---|---|---|
| 1 | Setup + Auth | `uvicorn` + `npm run dev` | Working login/register with JWT |
| 2 | Document Upload | + embedder auto-loads | PDF → ChromaDB chunks |
| 3 | RAG Pipeline + Chat API | + Ollama/OpenRouter | Cited answers via API |
| 4 | Chat Frontend | — | Full browser flow + Tailwind UI |
| 5 | Evaluation + Report | — | Phase 5 metrics + Phase 6 model table |

---

## Section 5 — Evaluation Framework

### 5.1 Phase 5 — Metric Acceptance Ranges (Summary)

| Metric | What It Measures | How Measured | Acceptance Range | Fail Action |
|---|---|---|---|---|
| **Faithfulness** | Claims in answer traceable to retrieved chunks | Manual: grounded / hallucinated claims per case | **≥ 0.90** | Tighten system prompt; reduce top-k for precision |
| **Task Success Rate** | Agent returned a substantive cited answer | Binary pass/fail per case | **≥ 80% (8/10)** | Debug retrieval first; check document was ingested correctly |
| **Total Latency** | End-to-end query time | `time.perf_counter()` wrapping full pipeline | **< 20 s** | Switch to OpenRouter if Ollama is slow; add ChromaDB index |
| **Time to First Token (TTFT)** | Perceived responsiveness | Separate timer around LLM call start | **< 2 s** | Use cloud model (OpenRouter) instead of local Ollama |
| **Cost per Query** | API token spend | OpenRouter `usage.prompt_tokens + completion_tokens` | **< $0.01 USD** | Free-tier models = $0.00; document this |

### 5.2 Phase 6 — Model Selection Acceptance Ranges (Summary)

| Tool | Metric | Acceptance Range |
|---|---|---|
| **HELM — LegalBench** | Exact Match | Higher = better; record and compare |
| **HELM — LegalBench** | F1 Score | Higher = better; record and compare |
| **Artificial Analysis** | Quality Index Score | **> 70** |
| **Artificial Analysis** | Output Speed (tokens/sec) | **> 50 tokens/sec** |
| **Artificial Analysis** | Context Window | **> 32,000 tokens** |
| **Artificial Analysis** | Cost per 1M Input Tokens | **< $10.00** |
| **Artificial Analysis** | Time to First Token (TTFT) | **< 2 seconds** |
| **LLM Arena** | Overall Elo Score | Higher = human-preferred; compare candidates |
| **LLM Arena** | Instruction Following Rank | Top 10 preferred |
| **LLM Arena** | Personal Battle Win Rate | > 50% on your 5 test queries |

### 5.3 Phase 6 — Final Model Selection Table

| Criteria | Source | GPT-4o | Mistral-7B (free) | DeepSeek-R1 (free) | Llama-3.1-8B (free) | Your Pick |
|---|---|---|---|---|---|---|
| LegalBench F1 | HELM | | | | | |
| Quality Index | Art. Analysis | | | | | |
| Tokens/sec | Art. Analysis | | | | | |
| Context Window | Art. Analysis | | | | | |
| Cost/1M tokens | Art. Analysis | | | | | |
| TTFT | Art. Analysis | | | | | |
| Elo Score | LLM Arena | | | | | |
| Battle Win Rate | LLM Arena | | | | | |
| **Passes all ranges?** | | | | | | |

**Selected Model:** ______________________  
**Justification:** _(2 sentences referencing the benchmark data above)_

### 5.4 Phase 2 — Deferred Evaluation Upgrades

| Upgrade | Tool | Why Deferred |
|---|---|---|
| Automated faithfulness scoring | RAGAS | Requires additional LLM-as-judge setup |
| Recall@K retrieval accuracy | Custom eval script | Requires ground-truth chunk labeling |
| API load testing | locust or k6 | Requires deployed server |
| E2E browser tests | Playwright | Requires stable deployment |

---

## Phase 2 — Full Deferred Task List

The following are explicitly out of scope for the 5-day Phase 1 sprint and should be planned after Phase 1 is complete and demonstrated.

### Infrastructure & DevOps (High Complexity)
- Docker + Docker Compose (PostgreSQL, backend, frontend, Ollama as services)
- Production deployment (VPS, Nginx, HTTPS, Gunicorn)
- Environment secret management (GitHub Secrets, Vault)
- CI/CD pipeline (GitHub Actions — lint, test, build, deploy)

### Database Upgrades (Medium Complexity)
- Migrate SQLite → PostgreSQL
- Migrate ChromaDB → pgvector (unified single store)
- Alembic migration system for schema versioning
- Database backups and restore strategy
- Connection pooling for concurrent users

### AI Upgrades (Medium Complexity)
- LangChain → LangGraph stateful agent (multi-step reasoning, memory)
- Streaming LLM responses (SSE or WebSocket)
- Background task queue for large PDF ingestion (Celery + Redis)
- RAGAS automated evaluation
- Multi-document cross-referencing

### Frontend Upgrades (Low–Medium Complexity)
- Zustand state management (replace React Context)
- Playwright E2E test suite
- Dark mode
- Keyboard shortcuts
- Export chat history as PDF
- Mobile responsive layout

### Security Hardening (Medium Complexity)
- Refresh token rotation
- Rate limiting (slowapi)
- Prompt injection defense
- File content scanning (beyond MIME type)
- HTTPS + TLS certificate

---

*End of Blueprint v2 — AI-Powered Legal Research Assistant*  
*Phase 1: 5 Days · No Docker · SQLite + ChromaDB · HuggingFace Embeddings · LangChain LCEL*  
*Phase 2: Docker · PostgreSQL + pgvector · LangGraph · Deployment · Production Hardening*
