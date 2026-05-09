from datetime import datetime, timedelta, timezone
import bcrypt as _bcrypt
from jose import jwt, JWTError
from app.config import settings
from app.exceptions import AuthenticationError  # domain exception — NOT HTTPException

# Use bcrypt directly — passlib 1.7.4 is incompatible with bcrypt >= 4.0
# (passlib's detect_wrap_bug test uses a 73-byte password which bcrypt now rejects)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str:
    """
    Returns user_id (sub) from a valid JWT.
    Raises AuthenticationError (domain exception) on failure.
    The caller (dependencies.py) is responsible for translating this to HTTP 401.

    Critical Fix: utils must be HTTP-agnostic. Never raise HTTPException here.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        return user_id
    except JWTError as exc:
        raise AuthenticationError("Token is invalid or expired") from exc
