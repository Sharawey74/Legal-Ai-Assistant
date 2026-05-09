from pathlib import Path
from typing import NamedTuple
import fitz       # PyMuPDF
import docx       # python-docx
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
