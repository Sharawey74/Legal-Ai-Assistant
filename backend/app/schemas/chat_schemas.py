from __future__ import annotations
import json
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, Any


class CitationSchema(BaseModel):
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

    @field_validator("document_ids", mode="before")
    def parse_document_ids(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
    is_thinking_mode: bool = False


class MessageResponse(BaseModel):
    id:         str
    session_id: str
    role:       str
    content:    str
    citations:  list[CitationSchema]
    created_at: datetime

    @field_validator("citations", mode="before")
    def parse_citations(cls, v: Any) -> list[CitationSchema]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v

    model_config = {"from_attributes": True}
