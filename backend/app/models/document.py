from app.database import Base
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func
import uuid


class Document(Base):
    __tablename__ = "documents"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     = Column(String, nullable=False, index=True)
    filename    = Column(String, nullable=False)
    file_path   = Column(String, nullable=False)
    file_size   = Column(Integer, nullable=False, default=0)
    page_count  = Column(Integer, nullable=False, default=0)
    status      = Column(String, nullable=False, default="processing")   # processing | ready | error
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
