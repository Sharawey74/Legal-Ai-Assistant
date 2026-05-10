from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth_schemas import RegisterRequest, LoginRequest, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token
from app.exceptions import DuplicateEmailError, AuthenticationError


class AuthService:
    """
    Auth business logic. HTTP-agnostic: raises domain exceptions only.
    main.py exception handlers translate them to 400/401 responses.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, request: RegisterRequest) -> dict:
        existing = self.db.query(User).filter(User.email == request.email).first()
        if existing:
            raise DuplicateEmailError(request.email)  # → global handler → 400
        user = User(
            email=request.email,
            password_hash=hash_password(request.password),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return {"message": "Account created successfully", "user_id": user.id}

    def login(self, request: LoginRequest) -> TokenResponse:
        user = self.db.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.password_hash):
            raise AuthenticationError("Incorrect email or password")  # → global handler → 401
        token = create_access_token(user.id)
        return TokenResponse(access_token=token)
