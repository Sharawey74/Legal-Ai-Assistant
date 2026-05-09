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

    def __init__(self, db: Session) -> None:
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
