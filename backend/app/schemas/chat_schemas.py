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
