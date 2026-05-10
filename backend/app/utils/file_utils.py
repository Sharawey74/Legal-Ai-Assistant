import os
import shutil
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}


def save_upload(file_bytes: bytes, filename: str, user_id: str) -> str:
    """
    Persist the uploaded file to the upload directory and return its path.
    Creates a user-scoped subdirectory to avoid collisions.
    """
    upload_dir = Path(settings.UPLOAD_DIR) / user_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest = upload_dir / filename
    # If a file with the same name already exists, add a counter suffix
    counter = 1
    stem    = dest.stem
    suffix  = dest.suffix
    while dest.exists():
        dest = upload_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    dest.write_bytes(file_bytes)
    logger.info(f"Saved upload: {dest} ({len(file_bytes)} bytes)")
    return str(dest)


def delete_upload(file_path: str) -> None:
    """Remove a file from disk, ignoring errors if it is already gone."""
    try:
        Path(file_path).unlink(missing_ok=True)
    except OSError as exc:
        logger.warning(f"Could not delete file {file_path}: {exc}")
