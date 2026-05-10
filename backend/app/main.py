from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import init_db
from app.routers import auth, documents, chat
from app.exceptions import (
    DuplicateEmailError,
    AuthenticationError,
    DocumentNotFoundError,
    DocumentProcessingError,
    ChatSessionNotFoundError,
    InvalidChatRequestError,
    UnsupportedFileTypeError,
    FileSizeLimitError,
)


def register_exception_handlers(app: FastAPI) -> None:
    """
    Centralised domain exception → HTTP response mapping.
    Services raise typed domain exceptions; this handler converts them.
    Services remain completely HTTP-agnostic.
    """

    @app.exception_handler(DuplicateEmailError)
    async def duplicate_email(_: Request, exc: DuplicateEmailError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(AuthenticationError)
    async def auth_error(_: Request, exc: AuthenticationError):
        return JSONResponse(status_code=401, content={"detail": str(exc)})

    @app.exception_handler(DocumentNotFoundError)
    async def doc_not_found(_: Request, exc: DocumentNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(UnsupportedFileTypeError)
    async def unsupported_type(_: Request, exc: UnsupportedFileTypeError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(FileSizeLimitError)
    async def file_too_large(_: Request, exc: FileSizeLimitError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(DocumentProcessingError)
    async def processing_error(_: Request, exc: DocumentProcessingError):
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    @app.exception_handler(ChatSessionNotFoundError)
    async def session_not_found(_: Request, exc: ChatSessionNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(InvalidChatRequestError)
    async def invalid_chat_request(_: Request, exc: InvalidChatRequestError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})


def create_app() -> FastAPI:
    app = FastAPI(
        title="Legal AI Research Assistant",
        description="AI-powered legal document research and Q&A system",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173", 
            "http://127.0.0.1:5173", 
            "http://localhost:5174", 
            "http://127.0.0.1:5174",
            "http://localhost:3000"
        ],
        allow_origin_regex="https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)  # ← all domain → HTTP translation lives here

    app.include_router(auth.router,      prefix="/api/v1")
    app.include_router(documents.router, prefix="/api/v1")
    app.include_router(chat.router,      prefix="/api/v1")

    @app.on_event("startup")
    async def startup():
        init_db()

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "Legal AI Assistant API"}

    return app


app = create_app()
