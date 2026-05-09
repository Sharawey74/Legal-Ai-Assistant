class LegalAIError(Exception):
    """Base exception for all domain errors in the Legal AI Assistant."""


class AuthenticationError(LegalAIError):
    """Raised when credentials are invalid or a token cannot be verified."""


class DuplicateEmailError(LegalAIError):
    """Raised when registration is attempted with an existing email."""

    def __init__(self, email: str) -> None:
        super().__init__(f"An account with email '{email}' already exists.")
        self.email = email


class DocumentNotFoundError(LegalAIError):
    """Raised when a document does not exist or does not belong to the requester."""

    def __init__(self, document_id: str) -> None:
        super().__init__(f"Document '{document_id}' not found.")
        self.document_id = document_id


class DocumentProcessingError(LegalAIError):
    """Raised when text extraction or embedding fails."""


class ChatSessionNotFoundError(LegalAIError):
    """Raised when a chat session does not exist or does not belong to the user."""


class InvalidChatRequestError(LegalAIError):
    """Raised when a chat request is malformed (e.g., no documents selected)."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)


class UnsupportedFileTypeError(LegalAIError):
    """Raised when an uploaded file has an unsupported extension."""

    def __init__(self, extension: str, supported: set[str]) -> None:
        super().__init__(
            f"File type '{extension}' is not supported. "
            f"Supported: {', '.join(sorted(supported))}"
        )


class FileSizeLimitError(LegalAIError):
    """Raised when an uploaded file exceeds the maximum allowed size."""

    def __init__(self, actual_bytes: int, max_bytes: int) -> None:
        max_mb = max_bytes // (1024 * 1024)
        super().__init__(
            f"File size {actual_bytes // 1024} KB exceeds the {max_mb} MB limit."
        )
