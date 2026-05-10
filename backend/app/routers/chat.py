from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.schemas.chat_schemas import CreateSessionRequest, SessionResponse, SendMessageRequest, MessageResponse
from app.services.chat_service import ChatService
from app.models.user import User


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new chat session scoped to specific documents."""
    service = ChatService(db)
    return service.create_session(request, user.id)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all chat sessions for the current user."""
    service = ChatService(db)
    return service.list_sessions(user.id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a chat session."""
    service = ChatService(db)
    service.delete_session(session_id, user.id)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all messages in a chat session."""
    service = ChatService(db)
    return service.get_messages(session_id, user.id)


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Send a message to a session and get a blocking response."""
    service = ChatService(db)
    return service.handle_message(session_id, request, user.id)


@router.post("/sessions/{session_id}/stream")
def send_message_stream(
    session_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Send a message and get a Server-Sent Events (SSE) streaming response."""
    service = ChatService(db)
    return StreamingResponse(
        service.handle_message_stream(session_id, request, user.id),
        media_type="text/event-stream"
    )
