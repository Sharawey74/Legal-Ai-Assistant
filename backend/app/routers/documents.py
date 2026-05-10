from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.schemas.document_schemas import DocumentResponse
from app.services.document_service import DocumentService
from app.models.user import User


router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Upload a legal document for RAG processing."""
    service = DocumentService(db)
    return await service.upload_document(file, user.id)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all documents uploaded by the current user."""
    service = DocumentService(db)
    return service.list_documents(user.id)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get status and details of a specific document."""
    service = DocumentService(db)
    return service.get_document(document_id, user.id)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a document and its associated vector embeddings."""
    service = DocumentService(db)
    service.delete_document(document_id, user.id)
