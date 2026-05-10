import uuid
from typing import Generator
from sqlalchemy.orm import Session
from app.exceptions import ChatSessionNotFoundError, InvalidChatRequestError
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat_schemas import CreateSessionRequest, SendMessageRequest, MessageResponse
from app.services.rag_service import RAGService


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.rag = RAGService()

    def create_session(self, request: CreateSessionRequest, user_id: str) -> ChatSession:
        if not request.document_ids:
            raise InvalidChatRequestError("At least one document must be selected")
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=request.title or "New Chat",
        )
        session.set_document_ids(request.document_ids)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def list_sessions(self, user_id: str) -> list[ChatSession]:
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
            .all()
        )

    def delete_session(self, session_id: str, user_id: str) -> None:
        session = self._get_session(session_id, user_id)
        self.db.delete(session)
        self.db.commit()

    def get_messages(self, session_id: str, user_id: str) -> list[ChatMessage]:
        self._get_session(session_id, user_id)    # validates ownership
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
            .all()
        )

    def handle_message(
        self,
        session_id: str,
        request: SendMessageRequest,
        user_id: str,
    ) -> MessageResponse:
        session = self._get_session(session_id, user_id)
        document_ids = session.get_document_ids()

        # 1. Save the user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.content,
        )
        self.db.add(user_msg)

        # Update session title to first message if still default
        if session.title == "New Chat":
            session.title = request.content[:80]
        self.db.commit()

        # 2. Run RAG pipeline
        result = self.rag.run(
            query=request.content,
            user_id=user_id,
            document_ids=document_ids,
            is_thinking_mode=request.is_thinking_mode,
        )

        # 3. Save assistant response
        assistant_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="assistant",
            content=result["answer"],
        )
        assistant_msg.set_citations(result["citations"])
        self.db.add(assistant_msg)
        self.db.commit()
        self.db.refresh(assistant_msg)

        return MessageResponse(
            id=assistant_msg.id,
            session_id=session_id,
            role="assistant",
            content=assistant_msg.content,
            citations=assistant_msg.get_citations(),
            created_at=assistant_msg.created_at,
        )

    def handle_message_stream(
        self,
        session_id: str,
        request: SendMessageRequest,
        user_id: str,
    ) -> Generator[str, None, None]:
        """
        Streaming version of handle_message.
        Yields SSE-formatted tokens, then saves the full response to the DB.
        """
        from app.ai.chain import stream_rag_chain

        session = self._get_session(session_id, user_id)
        document_ids = session.get_document_ids()

        # 1. Save user message to DB first
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.content,
        )
        self.db.add(user_msg)
        if session.title == "New Chat":
            session.title = request.content[:80]
        self.db.commit()

        # 2. Retrieve chunks (embed + vector search)
        from app.ai.embedder import embed_text
        from app.ai.vector_store import search_chunks

        query_embedding = embed_text(request.content)
        chunks = search_chunks(
            query_embedding=query_embedding,
            user_id=user_id,
            document_ids=document_ids,
            top_k=3,
        )

        # 3. Stream tokens from LLM; accumulate full answer for DB storage
        full_answer = []
        final_citations = []

        for sse_event in stream_rag_chain(request.content, chunks, request.is_thinking_mode):
            if sse_event.startswith("data: [CITATIONS]"):
                import json
                citations_json = sse_event[len("data: [CITATIONS]"):].strip()
                try:
                    final_citations = json.loads(citations_json)
                except Exception:
                    final_citations = []
                yield sse_event
            elif sse_event.startswith("data: [DONE]"):
                assistant_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="assistant",
                    content="".join(full_answer).replace("\\n", "\n"),
                )
                assistant_msg.set_citations(final_citations)
                self.db.add(assistant_msg)
                self.db.commit()
                yield sse_event
            elif sse_event.startswith("data: [ERROR]"):
                yield sse_event
            else:
                token = sse_event[len("data: "):].rstrip("\n")
                full_answer.append(token)
                yield sse_event

    def _get_session(self, session_id: str, user_id: str) -> ChatSession:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if not session:
            raise ChatSessionNotFoundError()
        return session
