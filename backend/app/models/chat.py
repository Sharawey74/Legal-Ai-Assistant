import uuid, json
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title:        Mapped[str]      = mapped_column(String(255), default="New Chat")
    document_ids: Mapped[str]      = mapped_column(Text, default="[]")   # JSON string
    created_at:   Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def get_document_ids(self) -> list[str]:
        return json.loads(self.document_ids)

    def set_document_ids(self, ids: list[str]) -> None:
        self.document_ids = json.dumps(ids)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role:       Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant
    content:    Mapped[str] = mapped_column(Text, nullable=False)
    citations:  Mapped[str] = mapped_column(Text, default="[]")          # JSON string
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def get_citations(self) -> list[dict]:
        return json.loads(self.citations)

    def set_citations(self, citations: list[dict]) -> None:
        self.citations = json.dumps(citations)
