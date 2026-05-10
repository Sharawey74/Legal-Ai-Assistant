import json
from app.database import Base
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
import uuid


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id      = Column(String, nullable=False, index=True)
    title        = Column(String, nullable=False, default="New Chat")
    document_ids = Column(Text, nullable=False, default="[]")   # JSON list of document UUIDs
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    def get_document_ids(self) -> list[str]:
        return json.loads(self.document_ids)

    def set_document_ids(self, ids: list[str]) -> None:
        self.document_ids = json.dumps(ids)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, index=True)
    role       = Column(String, nullable=False)          # "user" | "assistant"
    content    = Column(Text, nullable=False)
    citations  = Column(Text, nullable=False, default="[]")  # JSON list of citation dicts
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def get_citations(self) -> list[dict]:
        return json.loads(self.citations)

    def set_citations(self, citations: list[dict]) -> None:
        self.citations = json.dumps(citations)
