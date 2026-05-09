from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
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


@router.post("/sessions/{session_id}/stream")
def stream_message(
    session_id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Streaming endpoint — returns Server-Sent Events (SSE).

    SSE protocol:
      data: <token>\\n\\n           — one token at a time during generation
      data: [CITATIONS]<json>\\n\\n — full citations array after generation
      data: [DONE]\\n\\n            — stream complete

    The caller must save the user message and reload messages after [DONE].
    The backend saves the full assistant response to the DB when stream ends.
    """
    service = ChatService(db)
    generator = service.handle_message_stream(session_id, body, current_user.id)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",       # disable nginx buffering
            "Access-Control-Allow-Origin": "*",
        },
    )

