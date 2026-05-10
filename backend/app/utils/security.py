from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings
from app.exceptions import AuthenticationError

ALGORITHM  = "HS256"
EXPIRY_H   = 24   # token lifetime in hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire  = datetime.now(timezone.utc) + timedelta(hours=EXPIRY_H)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str:
    """
    Decode and validate a JWT.  Returns the user_id (subject).
    Raises AuthenticationError on any failure — keeps HTTP concerns
    out of this utility layer.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Token payload missing subject.")
        return user_id
    except JWTError as exc:
        raise AuthenticationError(f"Invalid or expired token: {exc}") from exc
