from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.exceptions import DuplicateEmailError, AuthenticationError
from app.models.user import User
from app.schemas.auth_schemas import RegisterRequest, LoginRequest, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_user(self, request: RegisterRequest) -> User:
        user = User(
            email=request.email,
            hashed_pw=hash_password(request.password)
        )
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise DuplicateEmailError(email=request.email)

    def login_user(self, request: LoginRequest) -> TokenResponse:
        user = self.db.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.hashed_pw):
            raise AuthenticationError("Invalid email or password.")
        
        token = create_access_token(user.id)
        return TokenResponse(access_token=token)
