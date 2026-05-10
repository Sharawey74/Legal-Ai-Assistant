from app.database import Base
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
import uuid


class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String, unique=True, nullable=False, index=True)
    hashed_pw  = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
