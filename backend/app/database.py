from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


# SQLite connection — check_same_thread=False required for FastAPI async
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables on startup. Safe to call multiple times."""
    from app.models import user, document, chat  # noqa: F401 — imports trigger table registration
    Base.metadata.create_all(bind=engine)
