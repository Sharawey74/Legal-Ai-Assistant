# DAY 2 PROMPT
## Document Upload, PDF Processing, Embedding, and ChromaDB Ingestion

---

### CONTEXT

Day 1 is complete. Authentication works. Today you implement the full document management system: PDF upload, text extraction, chunking, embedding, and vector storage. All embeddings run locally using HuggingFace `BAAI/bge-base-en-v1.5` — no API key required.

**Supporting document types to handle:** `.pdf`, `.txt`, `.md`, `.docx`
The primary source for the 10 legal test cases is:
`C:\Users\DELL\Desktop\Legal-Ai-Assistant\PDF\Legal_AI_Assistant_Final_Project_ABS.pdf`

---

### TASK 1 — Add New Dependencies

**Append to `backend\requirements.txt`:**
```
pymupdf==1.24.3
python-docx==1.1.0
langchain-text-splitters>=0.2.0
sentence-transformers>=2.7.0
chromadb>=0.5.0
```

Then run:
```bash
pip install -r requirements.txt
```

> **Note:** `sentence-transformers` downloads `BAAI/bge-base-en-v1.5` (~430 MB) on first run. Ensure internet access. The model is cached locally after the first download and never downloads again.

---

### TASK 2 — Implement the Embedding Model Wrapper

**File: `backend\app\ai\__init__.py`** — create empty file

**File: `backend\app\ai\embedder.py`**

```python
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.config import settings


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Load model once and cache. BAAI/bge-base-en-v1.5 outputs 768-dim vectors."""
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_text(text: str) -> list[float]:
    """Embed a single text string. Returns a 768-dimensional float list."""
    model = get_embedding_model()
    return model.encode(text, normalize_embeddings=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts efficiently in one batch call."""
    model = get_embedding_model()
    return model.encode(texts, normalize_embeddings=True, batch_size=32).tolist()
```

> **Why `normalize_embeddings=True`?** BGE models are trained with normalized embeddings. Normalizing ensures cosine similarity scores are accurate and comparable across queries.

---

### TASK 3 — Implement the ChromaDB Vector Store

**File: `backend\app\ai\vector_store.py`**

```python
import uuid
from functools import lru_cache
import chromadb
from app.config import settings


@lru_cache(maxsize=1)
def get_chroma_collection():
    """
    Initialize ChromaDB with persistent local storage. Called once.
    Compatible with chromadb >= 0.5.0 (including 1.x).
    """
    client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_PATH)
    return client.get_or_create_collection(
        name="legal_chunks",
        metadata={"hnsw:space": "cosine"}
    )


def add_chunks(
    chunks: list[dict],
    user_id: str,
    document_id: str,
    filename: str
) -> None:
    """
    Store text chunks with their embeddings in ChromaDB.

    Each chunk dict must have: {"text": str, "embedding": list[float], "page_number": int, "chunk_index": int}
    """
    collection = get_chroma_collection()
    ids         = [str(uuid.uuid4()) for _ in chunks]
    documents   = [c["text"] for c in chunks]
    embeddings  = [c["embedding"] for c in chunks]
    metadatas   = [
        {
            "user_id":     user_id,
            "document_id": document_id,
            "filename":    filename,
            "page_number": c["page_number"],
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]
    collection.add(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)


def search_chunks(
    query_embedding: list[float],
    user_id: str,
    document_ids: list[str],
    top_k: int = 5
) -> list[dict]:
    """
    Retrieve top-k most similar chunks for a query, scoped to specific documents.
    Returns list of dicts with text, filename, page_number, and distance.
    """
    collection = get_chroma_collection()

    where_filter: dict = {
        "$and": [
            {"user_id":     {"$eq": user_id}},
            {"document_id": {"$in": document_ids}},
        ]
    }

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    if not results["documents"] or not results["documents"][0]:
        return []

    return [
        {
            "text":        results["documents"][0][i],
            "filename":    results["metadatas"][0][i]["filename"],
            "page_number": results["metadatas"][0][i]["page_number"],
            "distance":    results["distances"][0][i],
        }
        for i in range(len(results["documents"][0]))
    ]


def delete_document_chunks(document_id: str) -> None:
    """Remove all chunks belonging to a document when the document is deleted."""
    collection = get_chroma_collection()
    collection.delete(where={"document_id": {"$eq": document_id}})
```

---

### TASK 4 — Implement the PDF/Document Processor

**File: `backend\app\utils\pdf_processor.py`**

```python
import os
from pathlib import Path
from typing import NamedTuple
import fitz                                   # PyMuPDF
import docx                                   # python-docx
from langchain_text_splitters import RecursiveCharacterTextSplitter


class PageText(NamedTuple):
    page_number: int
    text: str


class ProcessedChunk(NamedTuple):
    text: str
    page_number: int
    chunk_index: int


SUPPORTED_EXTENSIONS: set[str] = {".pdf", ".txt", ".md", ".docx"}


def extract_text_by_page(file_path: str) -> list[PageText]:
    """
    Extract text from a document, returning one PageText per page/section.
    Supports: .pdf, .txt, .md, .docx
    Raises UnsupportedFileTypeError for unknown extensions.
    """
    from app.exceptions import UnsupportedFileTypeError
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext in (".txt", ".md"):
        return _extract_plaintext(file_path)
    elif ext == ".docx":
        return _extract_docx(file_path)
    else:
        raise UnsupportedFileTypeError(ext, SUPPORTED_EXTENSIONS)


def _extract_pdf(file_path: str) -> list[PageText]:
    pages = []
    with fitz.open(file_path) as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append(PageText(page_number=page_num, text=text))
    return pages


def _extract_plaintext(file_path: str) -> list[PageText]:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read().strip()
    # Treat the whole file as page 1
    return [PageText(page_number=1, text=content)] if content else []


def _extract_docx(file_path: str) -> list[PageText]:
    doc = docx.Document(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    content = "\n\n".join(paragraphs)
    return [PageText(page_number=1, text=content)] if content else []


def chunk_pages(pages: list[PageText]) -> list[ProcessedChunk]:
    """
    Split page texts into overlapping chunks using RecursiveCharacterTextSplitter.
    chunk_size=800, chunk_overlap=100 — tuned for legal document paragraphs.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    all_chunks: list[ProcessedChunk] = []
    global_index = 0

    for page in pages:
        splits = splitter.split_text(page.text)
        for split in splits:
            if split.strip():
                all_chunks.append(ProcessedChunk(
                    text=split.strip(),
                    page_number=page.page_number,
                    chunk_index=global_index,
                ))
                global_index += 1

    return all_chunks


def get_page_count(file_path: str) -> int:
    """Return number of pages/sections for metadata storage."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        with fitz.open(file_path) as doc:
            return len(doc)
    return 1  # txt, md, docx treated as single-page
```

---

### TASK 5 — Add Document Models and Schemas

**File: `backend\app\models\document.py`**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename:   Mapped[str] = mapped_column(String(255), nullable=False)
    file_size:  Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    status:     Mapped[str] = mapped_column(String(20), default="processing")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
```

---

Update `backend\app\database.py` — add the document model import to `init_db`:

```python
def init_db() -> None:
    from app.models import user, document  # noqa: F401
    Base.metadata.create_all(bind=engine)
```

---

**File: `backend\app\schemas\document_schemas.py`**

```python
from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

### TASK 6 — Implement the Document Service

**File: `backend\app\services\document_service.py`**

```python
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.config import settings
from app.models.document import Document
from app.ai.embedder import embed_batch
from app.ai.vector_store import add_chunks, delete_document_chunks
from app.utils.pdf_processor import extract_text_by_page, chunk_pages, get_page_count
from app.exceptions import (
    UnsupportedFileTypeError,
    FileSizeLimitError,
    DocumentNotFoundError,
    DocumentProcessingError,
)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


class DocumentService:
    """
    Document business logic. HTTP-agnostic: raises domain exceptions only.
    main.py exception handlers translate them to HTTP responses.
    """

    def __init__(self, db: Session):
        self.db = db

    def list_documents(self, user_id: str) -> list[Document]:
        return (
            self.db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.created_at.desc())
            .all()
        )

    async def upload_document(self, file: UploadFile, user_id: str) -> Document:
        # --- Validation (raises domain exceptions) ---
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise UnsupportedFileTypeError(ext, ALLOWED_EXTENSIONS)  # → 400

        content = await file.read()
        if len(content) > MAX_BYTES:
            raise FileSizeLimitError(len(content), MAX_BYTES)  # → 400

        # --- Save file to disk ---
        doc_id     = str(uuid.uuid4())
        safe_name  = f"{doc_id}{ext}"
        upload_dir = Path(settings.UPLOAD_DIR) / user_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path  = upload_dir / safe_name
        file_path.write_bytes(content)

        # --- Create DB record (status = processing) ---
        document = Document(
            id=doc_id,
            user_id=user_id,
            filename=file.filename,
            file_size=len(content),
            status="processing",
        )
        self.db.add(document)
        self.db.commit()

        # --- Process: extract → chunk → embed → store ---
        try:
            pages      = extract_text_by_page(str(file_path))
            raw_chunks = chunk_pages(pages)
            page_count = get_page_count(str(file_path))

            if not raw_chunks:
                raise DocumentProcessingError("No text could be extracted from the document")

            texts      = [c.text for c in raw_chunks]
            embeddings = embed_batch(texts)

            prepared = [
                {
                    "text":        raw_chunks[i].text,
                    "embedding":   embeddings[i],
                    "page_number": raw_chunks[i].page_number,
                    "chunk_index": raw_chunks[i].chunk_index,
                }
                for i in range(len(raw_chunks))
            ]

            add_chunks(chunks=prepared, user_id=user_id,
                       document_id=doc_id, filename=file.filename)

            document.status     = "ready"
            document.page_count = page_count
            self.db.commit()
            self.db.refresh(document)

        except (UnsupportedFileTypeError, FileSizeLimitError, DocumentProcessingError):
            document.status = "failed"
            self.db.commit()
            raise
        except Exception as exc:
            document.status = "failed"
            self.db.commit()
            raise DocumentProcessingError(f"Processing failed: {exc}") from exc

        return document

    def delete_document(self, document_id: str, user_id: str) -> None:
        document = (
            self.db.query(Document)
            .filter(Document.id == document_id, Document.user_id == user_id)
            .first()
        )
        if not document:
            raise DocumentNotFoundError(document_id)  # → 404

        delete_document_chunks(document_id)

        ext       = Path(document.filename).suffix.lower()
        file_path = Path(settings.UPLOAD_DIR) / user_id / f"{document_id}{ext}"
        if file_path.exists():
            file_path.unlink()

        self.db.delete(document)
        self.db.commit()
```

---

### TASK 7 — Implement the Documents Router

**Replace `backend\app\routers\documents.py`** entirely:

```python
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.document_schemas import DocumentResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DocumentService(db).list_documents(current_user.id)


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await DocumentService(db).upload_document(file, current_user.id)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    DocumentService(db).delete_document(document_id, current_user.id)
```

---

### TASK 8 — Build the Documents Frontend Page

**File: `frontend\src\types\document.types.ts`**

```typescript
export interface Document {
  id: string;
  filename: string;
  file_size: number;
  page_count: number;
  status: "processing" | "ready" | "failed";
  created_at: string;
}
```

---

**File: `frontend\src\api\documents.api.ts`**

```typescript
import client from "./client";
import type { Document } from "../types/document.types";

export const listDocuments = (): Promise<Document[]> =>
  client.get<Document[]>("/documents").then(r => r.data);

export const uploadDocument = (file: File): Promise<Document> => {
  const form = new FormData();
  form.append("file", file);
  return client.post<Document>("/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

export const deleteDocument = (id: string): Promise<void> =>
  client.delete(`/documents/${id}`).then(() => undefined);
```

---

**File: `frontend\src\components\documents\StatusBadge.tsx`**

```typescript
type Status = "processing" | "ready" | "failed";

const styles: Record<Status, string> = {
  processing: "bg-yellow-100 text-yellow-800",
  ready:      "bg-green-100  text-green-800",
  failed:     "bg-red-100    text-red-800",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
```

---

**File: `frontend\src\components\documents\DocumentCard.tsx`**

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Document } from "../../types/document.types";
import StatusBadge from "./StatusBadge";
import Button from "../ui/Button";
import { deleteDocument } from "../../api/documents.api";

interface Props {
  document: Document;
  onDeleted: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentCard({ document, onDeleted }: Props) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${document.filename}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteDocument(document.id);
      onDeleted(document.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{document.filename}</p>
        <p className="text-xs text-muted mt-1">
          {formatBytes(document.file_size)}
          {document.page_count > 0 && ` · ${document.page_count} pages`}
        </p>
        <div className="mt-2"><StatusBadge status={document.status} /></div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {document.status === "ready" && (
          <Button variant="primary"
                  onClick={() => navigate("/chat", { state: { documentId: document.id } })}>
            Chat
          </Button>
        )}
        <Button variant="danger" loading={deleting} onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
```

---

**File: `frontend\src\components\documents\UploadDropzone.tsx`**

```typescript
import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { uploadDocument } from "../../api/documents.api";
import type { Document } from "../../types/document.types";
import Button from "../ui/Button";

const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown",
                       "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_MB = 20;

interface Props { onUploaded: (doc: Document) => void; }

export default function UploadDropzone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function validate(file: File): string {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|txt|md|docx)$/i))
      return "Only PDF, TXT, MD, and DOCX files are supported";
    if (file.size > MAX_MB * 1024 * 1024)
      return `File must be smaller than ${MAX_MB} MB`;
    return "";
  }

  async function handleFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError("");
    setUploading(true);
    try {
      const doc = await uploadDocument(file);
      onUploaded(doc);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${dragging ? "border-primary bg-blue-50" : "border-slate-300 hover:border-primary"}`}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file"
             accept=".pdf,.txt,.md,.docx" className="hidden" onChange={onChange} />
      <p className="text-slate-600 font-medium">
        {uploading ? "Uploading and processing…" : "Drop a file here or click to browse"}
      </p>
      <p className="text-xs text-muted mt-1">PDF · TXT · MD · DOCX — max 20 MB</p>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
```

---

**File: `frontend\src\pages\DocumentsPage.tsx`** (replace placeholder):

```typescript
import { useState, useEffect } from "react";
import { listDocuments } from "../api/documents.api";
import type { Document } from "../types/document.types";
import DocumentCard from "../components/documents/DocumentCard";
import UploadDropzone from "../components/documents/UploadDropzone";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function DocumentsPage() {
  const { signOut } = useAuth();
  const navigate    = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => setError("Failed to load documents"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1>Legal AI Assistant</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate("/history")}>History</Button>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        <section>
          <h2 className="mb-4">Upload a Document</h2>
          <UploadDropzone onUploaded={doc => setDocuments(prev => [doc, ...prev])} />
        </section>

        <section>
          <h2 className="mb-4">Your Documents ({documents.length})</h2>
          {loading && <p className="text-muted text-sm">Loading…</p>}
          {error   && <p className="text-danger text-sm">{error}</p>}
          {!loading && documents.length === 0 && (
            <p className="text-muted text-sm">No documents yet. Upload one above to get started.</p>
          )}
          <div className="flex flex-col gap-3">
            {documents.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDeleted={id => setDocuments(prev => prev.filter(d => d.id !== id))}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

**Replace `frontend\src\router.tsx`** — wire up real `DocumentsPage`:

```typescript
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";
import LoginPage     from "./pages/LoginPage";
import RegisterPage  from "./pages/RegisterPage";
import DocumentsPage from "./pages/DocumentsPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="text-center">
      <h1>{title}</h1>
      <p className="text-muted mt-2 text-sm">Coming in Day 3–4</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  { path: "/",                element: <Navigate to="/login" replace /> },
  { path: "/login",           element: <LoginPage /> },
  { path: "/register",        element: <RegisterPage /> },
  { path: "/documents",       element: <ProtectedRoute><DocumentsPage /></ProtectedRoute> },
  { path: "/chat",            element: <ProtectedRoute><Placeholder title="Chat" /></ProtectedRoute> },
  { path: "/chat/:sessionId", element: <ProtectedRoute><Placeholder title="Chat Session" /></ProtectedRoute> },
  { path: "/history",         element: <ProtectedRoute><Placeholder title="History" /></ProtectedRoute> },
  { path: "*",                element: <Navigate to="/login" replace /> },
]);
```

---

### DAY 2 END-OF-DAY VERIFICATION CHECKLIST

- [ ] `pip install -r requirements.txt` completes without error
- [ ] Backend restarts cleanly — `documents` table created in `legal_assistant.db`
- [ ] `GET /api/v1/documents` (with valid JWT) returns an empty array `[]`
- [ ] Upload `Legal_AI_Assistant_Final_Project_ABS.pdf` via the Swagger UI or frontend → returns status `ready`
- [ ] `chroma_store\` folder exists and contains ChromaDB data files
- [ ] Upload a `.txt` file — status becomes `ready`
- [ ] Upload a non-PDF/non-supported file → returns `400` with clear error message
- [ ] Upload a document → `DELETE /api/v1/documents/{id}` → document disappears from list
- [ ] Frontend Documents page shows uploaded file with green "ready" badge
- [ ] Delete button on DocumentCard shows confirmation dialog before deleting
- [ ] "Chat" button appears only on documents with `ready` status
