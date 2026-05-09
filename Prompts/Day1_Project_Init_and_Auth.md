# DAY 1 PROMPT
## Project Initialization, Folder Structure, and Authentication System

---

### CONTEXT

You are implementing Day 1 of a 5-day Phase 1 build for an AI-Powered Legal Research Assistant. This is a local-only system — no Docker, no deployment. The stack is:

- **Backend:** Python 3.11+, FastAPI, SQLite (via SQLAlchemy), JWT authentication
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS

The project root already exists at:
```
C:\Users\DELL\Desktop\Legal-Ai-Assistant\
```

Your deliverable at the end of Day 1 is a fully working authentication system — register, login, JWT, and protected routes — with the complete project skeleton in place.

---

### TASK 1 — Create the Monorepo Folder Structure

Create the following directory and file structure exactly as specified. Do not add extra files or folders beyond what is listed.

```
C:\Users\DELL\Desktop\Legal-Ai-Assistant\
├── backend\
│   ├── app\
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── routers\
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── documents.py          ← empty router, endpoints added Day 2
│   │   │   └── chat.py               ← empty router, endpoints added Day 3
│   │   ├── services\
│   │   │   ├── __init__.py
│   │   │   └── auth_service.py
│   │   ├── models\
│   │   │   ├── __init__.py
│   │   │   └── user.py
│   │   ├── schemas\
│   │   │   ├── __init__.py
│   │   │   └── auth_schemas.py
│   │   └── utils\
│   │       ├── __init__.py
│   │       └── security.py
│   ├── uploads\                       ← empty folder, PDFs stored here Day 2
│   ├── chroma_store\                  ← empty folder, ChromaDB writes here Day 2
│   ├── .env
│   └── requirements.txt
│
├── frontend\
│   └── (initialized by Vite in Task 3)
│
├── .env.example
└── README.md
```

---

### TASK 2 — Create Backend Requirements and Configuration

**File: `backend\requirements.txt`**

Write the following dependencies exactly. Do not add or remove any package:

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic-settings==2.2.1
python-dotenv==1.0.1
aiofiles==23.2.1
```

---

**File: `backend\.env`**

Create this file with the following content. Replace `SECRET_KEY` with any random string of at least 32 characters:

```
SECRET_KEY=replace-this-with-a-random-string-minimum-32-characters-long
DATABASE_URL=sqlite:///./legal_assistant.db
CHROMA_PERSIST_PATH=./chroma_store
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=openai/gpt-oss-120b
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
FRONTEND_URL=http://localhost:5173
```

> **Note on LLM_PROVIDER:** Set to `openrouter` if you have an OpenRouter API key. Set to `ollama` if you have Ollama installed locally with `llama3.2:3b` pulled. Either works — the system supports both.

---

**File: `backend\app\config.py`**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str = "sqlite:///./legal_assistant.db"
    CHROMA_PERSIST_PATH: str = "./chroma_store"
    EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"
    LLM_PROVIDER: str = "openrouter"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-oss-120b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 20
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

### TASK 3 — Implement the Database Layer (SQLite, No Migrations)

**File: `backend\app\database.py`**

```python
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
    from app.models import user  # noqa: F401 — import triggers table registration
    Base.metadata.create_all(bind=engine)
```

---

**File: `backend\app\models\user.py`**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
```

---

### TASK 4 — Implement Security Utilities (bcrypt + JWT)

**File: `backend\app\utils\security.py`**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str:
    """Returns user_id (sub) from a valid token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid token payload")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token is invalid or expired")
```

---

### TASK 5 — Implement Auth Schemas

**File: `backend\app\schemas\auth_schemas.py`**

```python
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str

    model_config = {"from_attributes": True}
```

---

### TASK 6 — Implement Auth Service

**File: `backend\app\services\auth_service.py`**

```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.auth_schemas import RegisterRequest, LoginRequest, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, request: RegisterRequest) -> dict:
        existing = self.db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists"
            )
        user = User(
            email=request.email,
            password_hash=hash_password(request.password)
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return {"message": "Account created successfully", "user_id": user.id}

    def login(self, request: LoginRequest) -> TokenResponse:
        user = self.db.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        token = create_access_token(user.id)
        return TokenResponse(access_token=token)
```

---

### TASK 7 — Implement Dependencies

**File: `backend\app\dependencies.py`**

```python
from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.utils.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    user_id = decode_access_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User not found")
    return user
```

---

### TASK 8 — Implement Auth Router

**File: `backend\app\routers\auth.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.auth_schemas import RegisterRequest, LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register(request)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.login(request)
```

---

**File: `backend\app\routers\documents.py`** (placeholder)

```python
from fastapi import APIRouter

router = APIRouter(prefix="/documents", tags=["Documents"])
# Endpoints implemented on Day 2
```

---

**File: `backend\app\routers\chat.py`** (placeholder)

```python
from fastapi import APIRouter

router = APIRouter(prefix="/chat", tags=["Chat"])
# Endpoints implemented on Day 3
```

---

### TASK 9 — Implement Main App Entry Point

**File: `backend\app\main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import auth, documents, chat


def create_app() -> FastAPI:
    app = FastAPI(
        title="Legal AI Research Assistant",
        description="AI-powered legal document research and Q&A system",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

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
```

---

### TASK 10 — Initialize React Frontend with TailwindCSS

Run the following commands inside `C:\Users\DELL\Desktop\Legal-Ai-Assistant\`:

```bash
cd C:\Users\DELL\Desktop\Legal-Ai-Assistant
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios react-router-dom
npm install -D @types/react-router-dom
```

---

**File: `frontend\tailwind.config.ts`** — replace the generated file entirely:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:       "#1e40af",
        "primary-h":   "#1d4ed8",
        surface:       "#f8fafc",
        muted:         "#64748b",
        danger:        "#dc2626",
        "danger-h":    "#b91c1c",
        success:       "#16a34a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

**File: `frontend\src\index.css`** — replace entirely:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body  { @apply bg-surface text-slate-900 antialiased font-sans; }
  h1    { @apply text-2xl font-bold text-slate-800; }
  h2    { @apply text-xl font-semibold text-slate-700; }
}
```

---

**File: `frontend\.env`**

```
VITE_API_URL=http://localhost:8000
```

---

### TASK 11 — Build the Frontend Auth System

**File: `frontend\src\types\auth.types.ts`**

```typescript
export interface User {
  id: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
```

---

**File: `frontend\src\api\client.ts`**

```typescript
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const client = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — clear token and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;
```

---

**File: `frontend\src\api\auth.api.ts`**

```typescript
import client from "./client";
import type { TokenResponse } from "../types/auth.types";

export const register = (email: string, password: string) =>
  client.post("/auth/register", { email, password });

export const login = async (email: string, password: string): Promise<string> => {
  const res = await client.post<TokenResponse>("/auth/login", { email, password });
  return res.data.access_token;
};
```

---

**File: `frontend\src\context\AuthContext.tsx`**

```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );

  const signIn = useCallback((newToken: string) => {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("access_token");
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

---

**File: `frontend\src\components\ui\Button.tsx`**

```typescript
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-primary hover:bg-primary-h text-white",
  danger:  "bg-danger  hover:bg-danger-h  text-white",
  ghost:   "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export default function Button({ variant = "primary", loading, children, className = "", ...rest }: Props) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${variants[variant]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
```

---

**File: `frontend\src\components\ui\Input.tsx`**

```typescript
import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input
      ref={ref}
      className={`border rounded-lg px-3 py-2 text-sm outline-none
                  focus:ring-2 focus:ring-primary focus:border-transparent
                  ${error ? "border-danger" : "border-slate-300"}`}
      {...rest}
    />
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
));

Input.displayName = "Input";
export default Input;
```

---

**File: `frontend\src\pages\LoginPage.tsx`**

```typescript
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await login(email, password);
      signIn(token);
      navigate("/documents");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <h1 className="mb-6 text-center">Legal AI Assistant</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email}
                 onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password}
                 onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-danger text-center">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          No account?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

**File: `frontend\src\pages\RegisterPage.tsx`**

```typescript
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth.api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password);
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <h1 className="mb-6 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email}
                 onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password}
                 onChange={e => setPassword(e.target.value)}
                 placeholder="Minimum 6 characters" required />
          {error && <p className="text-sm text-danger text-center">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-2">
            Create Account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

**File: `frontend\src\router.tsx`**

```typescript
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ReactNode } from "react";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Placeholder pages — replaced with full implementations on Days 2–4
const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-screen flex items-center justify-center">
    <h1>{title} — Coming Soon</h1>
  </div>
);

export const router = createBrowserRouter([
  { path: "/",         element: <Navigate to="/login" replace /> },
  { path: "/login",    element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/documents",element: <ProtectedRoute><Placeholder title="Documents" /></ProtectedRoute> },
  { path: "/chat",     element: <ProtectedRoute><Placeholder title="Chat" /></ProtectedRoute> },
  { path: "/chat/:sessionId", element: <ProtectedRoute><Placeholder title="Chat Session" /></ProtectedRoute> },
  { path: "/history",  element: <ProtectedRoute><Placeholder title="History" /></ProtectedRoute> },
  { path: "*",         element: <Navigate to="/login" replace /> },
]);
```

---

**File: `frontend\src\App.tsx`** — replace entirely:

```typescript
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { router } from "./router";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```

---

**File: `frontend\src\main.tsx`** — replace entirely:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### TASK 12 — Install and Start Both Services

**Backend:**
```bash
cd C:\Users\DELL\Desktop\Legal-Ai-Assistant\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (new terminal):**
```bash
cd C:\Users\DELL\Desktop\Legal-Ai-Assistant\frontend
npm run dev
```

---

### DAY 1 END-OF-DAY VERIFICATION CHECKLIST

Before closing Day 1, confirm every item below passes:

- [ ] `GET http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] `GET http://localhost:8000/docs` shows the FastAPI Swagger UI with Auth endpoints
- [ ] `POST http://localhost:8000/api/v1/auth/register` with `{"email":"test@test.com","password":"test123"}` returns `201` and a success message
- [ ] `POST http://localhost:8000/api/v1/auth/register` with the same email again returns `400` with "already exists" message
- [ ] `POST http://localhost:8000/api/v1/auth/login` with valid credentials returns `{"access_token": "...", "token_type": "bearer"}`
- [ ] `POST http://localhost:8000/api/v1/auth/login` with wrong password returns `401`
- [ ] `GET http://localhost:5173` shows the Login page with Tailwind styling
- [ ] Register form creates an account and redirects to `/login`
- [ ] Login form authenticates and redirects to `/documents` (placeholder page)
- [ ] Refreshing `/documents` while logged in stays on the page (token persists in localStorage)
- [ ] Navigating to `/documents` while logged out redirects to `/login`
- [ ] File `legal_assistant.db` exists in `backend\` with a `users` table containing your test user
