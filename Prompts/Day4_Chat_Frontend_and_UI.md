# DAY 4 PROMPT
## Chat Frontend — Complete UI with TailwindCSS, Citation Panel, and History Page

---

### CONTEXT

The backend is fully working. Today you build the entire chat frontend: the chat window, citation panel, history page, and a shared layout component. All styling uses TailwindCSS utility classes exclusively. No new backend changes are needed today.

---

### TASK 1 — Add Chat Types

**File: `frontend\src\types\chat.types.ts`**

```typescript
export interface Citation {
  document_name: string;
  page_number:   number;
  excerpt:       string;
}

export interface ChatMessage {
  id:         string;
  session_id: string;
  role:       "user" | "assistant";
  content:    string;
  citations:  Citation[];
  created_at: string;
}

export interface ChatSession {
  id:           string;
  title:        string;
  document_ids: string[];
  created_at:   string;
}
```

---

### TASK 2 — Add Chat API Functions

**File: `frontend\src\api\chat.api.ts`**

```typescript
import client from "./client";
import type { ChatSession, ChatMessage } from "../types/chat.types";

export const createSession = (document_ids: string[], title?: string): Promise<ChatSession> =>
  client.post<ChatSession>("/chat/sessions", { document_ids, title }).then(r => r.data);

export const listSessions = (): Promise<ChatSession[]> =>
  client.get<ChatSession[]>("/chat/sessions").then(r => r.data);

export const deleteSession = (id: string): Promise<void> =>
  client.delete(`/chat/sessions/${id}`).then(() => undefined);

export const getMessages = (sessionId: string): Promise<ChatMessage[]> =>
  client.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`).then(r => r.data);

export const sendMessage = (sessionId: string, content: string): Promise<ChatMessage> =>
  client.post<ChatMessage>(`/chat/sessions/${sessionId}/messages`, { content }).then(r => r.data);
```

---

### TASK 3 — Build the Chat Context

**File: `frontend\src\context\ChatContext.tsx`**

```typescript
import { createContext, useContext, useReducer, ReactNode } from "react";
import type { ChatMessage, Citation } from "../types/chat.types";

interface ChatState {
  sessionId:          string | null;
  messages:           ChatMessage[];
  selectedDocumentIds: string[];
  activeCitations:    Citation[];
  loading:            boolean;
}

type Action =
  | { type: "SET_SESSION";   payload: string }
  | { type: "SET_MESSAGES";  payload: ChatMessage[] }
  | { type: "ADD_MESSAGE";   payload: ChatMessage }
  | { type: "SET_DOCS";      payload: string[] }
  | { type: "SET_CITATIONS"; payload: Citation[] }
  | { type: "SET_LOADING";   payload: boolean }
  | { type: "CLEAR" };

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "SET_SESSION":   return { ...state, sessionId: action.payload };
    case "SET_MESSAGES":  return { ...state, messages: action.payload };
    case "ADD_MESSAGE":   return { ...state, messages: [...state.messages, action.payload] };
    case "SET_DOCS":      return { ...state, selectedDocumentIds: action.payload };
    case "SET_CITATIONS": return { ...state, activeCitations: action.payload };
    case "SET_LOADING":   return { ...state, loading: action.payload };
    case "CLEAR":         return { sessionId: null, messages: [], selectedDocumentIds: [],
                                   activeCitations: [], loading: false };
    default: return state;
  }
}

const initial: ChatState = {
  sessionId: null, messages: [], selectedDocumentIds: [], activeCitations: [], loading: false,
};

const ChatContext = createContext<{ state: ChatState; dispatch: React.Dispatch<Action> } | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <ChatContext.Provider value={{ state, dispatch }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be inside ChatProvider");
  return ctx;
}
```

Update `frontend\src\App.tsx` — wrap the router with `ChatProvider`:
```typescript
import { ChatProvider } from "./context/ChatContext";
// wrap: <AuthProvider><ChatProvider><RouterProvider .../></ChatProvider></AuthProvider>
```

---

### TASK 4 — Build Chat Components

**File: `frontend\src\components\chat\MessageBubble.tsx`**

```typescript
import type { ChatMessage, Citation } from "../../types/chat.types";

interface Props {
  message: ChatMessage;
  onViewSources: (citations: Citation[]) => void;
}

export default function MessageBubble({ message, onViewSources }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                        ${isUser
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"}`}>
        <p className="whitespace-pre-wrap">{message.content}</p>

        {!isUser && message.citations.length > 0 && (
          <button
            onClick={() => onViewSources(message.citations)}
            className="mt-2 text-xs text-primary hover:underline font-medium"
          >
            View {message.citations.length} source{message.citations.length > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
```

---

**File: `frontend\src\components\chat\CitationPanel.tsx`**

```typescript
import type { Citation } from "../../types/chat.types";

interface Props {
  citations: Citation[];
  onClose: () => void;
}

export default function CitationPanel({ citations, onClose }: Props) {
  if (citations.length === 0) return null;

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm">Sources ({citations.length})</h2>
        <button onClick={onClose}
                className="text-muted hover:text-slate-800 text-lg leading-none"
                aria-label="Close sources panel">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {citations.map((c, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]">
                {c.document_name}
              </span>
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full flex-shrink-0">
                Page {c.page_number}
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed line-clamp-5">{c.excerpt}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
```

---

**File: `frontend\src\components\chat\ChatInput.tsx`**

```typescript
import { useState, KeyboardEvent, useRef, useEffect } from "react";
import Button from "../ui/Button";

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
  }

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-end gap-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Ask a legal question about your documents… (Ctrl+Enter to send)"
        className="flex-1 resize-none border border-slate-300 rounded-lg px-3 py-2
                   text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   disabled:opacity-50 max-h-40 overflow-y-auto"
      />
      <Button onClick={submit} disabled={!value.trim()} loading={disabled}>
        Send
      </Button>
    </div>
  );
}
```

---

**File: `frontend\src\components\chat\DocumentSelector.tsx`**

```typescript
import { useEffect, useState } from "react";
import { listDocuments } from "../../api/documents.api";
import type { Document } from "../../types/document.types";

interface Props {
  selectedIds:  string[];
  onChange:     (ids: string[]) => void;
}

export default function DocumentSelector({ selectedIds, onChange }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);

  useEffect(() => {
    listDocuments().then(all => setDocs(all.filter(d => d.status === "ready")));
  }, []);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide px-2 mb-1">
        Documents
      </p>
      {docs.length === 0 && (
        <p className="text-xs text-muted px-2">No ready documents</p>
      )}
      {docs.map(doc => (
        <label key={doc.id}
               className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(doc.id)}
            onChange={() => toggle(doc.id)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-xs text-slate-700 leading-snug break-all">{doc.filename}</span>
        </label>
      ))}
    </div>
  );
}
```

---

### TASK 5 — Build the Chat Page

**File: `frontend\src\pages\ChatPage.tsx`** (replace placeholder):

```typescript
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import { createSession, getMessages, sendMessage } from "../api/chat.api";
import type { Citation } from "../types/chat.types";
import MessageBubble    from "../components/chat/MessageBubble";
import ChatInput        from "../components/chat/ChatInput";
import CitationPanel    from "../components/chat/CitationPanel";
import DocumentSelector from "../components/chat/DocumentSelector";
import Button           from "../components/ui/Button";

export default function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const location  = useLocation();
  const navigate  = useNavigate();
  const { state, dispatch } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  // Initialise: load existing session OR wait for doc selection
  useEffect(() => {
    dispatch({ type: "CLEAR" });
    const preselected = (location.state as any)?.documentId;
    if (preselected) dispatch({ type: "SET_DOCS", payload: [preselected] });

    if (routeSessionId) {
      dispatch({ type: "SET_SESSION", payload: routeSessionId });
      getMessages(routeSessionId).then(msgs =>
        dispatch({ type: "SET_MESSAGES", payload: msgs })
      );
    }
  }, [routeSessionId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  async function handleSend(content: string) {
    if (state.selectedDocumentIds.length === 0) {
      alert("Please select at least one document before asking a question.");
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      let sid = state.sessionId;
      if (!sid) {
        const session = await createSession(state.selectedDocumentIds);
        sid = session.id;
        dispatch({ type: "SET_SESSION", payload: sid });
        navigate(`/chat/${sid}`, { replace: true });
      }

      // Optimistically add user message to UI
      dispatch({ type: "ADD_MESSAGE", payload: {
        id: "temp", session_id: sid, role: "user",
        content, citations: [], created_at: new Date().toISOString(),
      }});

      const response = await sendMessage(sid, content);
      // Replace temp with confirmed messages
      const msgs = await getMessages(sid);
      dispatch({ type: "SET_MESSAGES", payload: msgs });

      // Auto-show citations if present
      if (response.citations.length > 0) setActiveCitations(response.citations);

    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate("/documents")}>← Documents</Button>
        <span className="text-slate-400">|</span>
        <Button variant="ghost" onClick={() => navigate("/history")}>History</Button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — document selector */}
        <aside className="w-56 border-r border-slate-200 bg-white p-3 overflow-y-auto flex-shrink-0">
          <DocumentSelector
            selectedIds={state.selectedDocumentIds}
            onChange={ids => dispatch({ type: "SET_DOCS", payload: ids })}
          />
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {state.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <p className="text-slate-500 text-sm max-w-sm">
                  Select documents from the left panel and ask a legal question below.
                </p>
              </div>
            )}
            {state.messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onViewSources={setActiveCitations}
              />
            ))}
            {state.loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <span className="text-sm text-muted animate-pulse">Searching documents…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <ChatInput onSend={handleSend} disabled={state.loading} />
        </main>

        {/* Right panel — citations */}
        {activeCitations.length > 0 && (
          <CitationPanel
            citations={activeCitations}
            onClose={() => setActiveCitations([])}
          />
        )}
      </div>
    </div>
  );
}
```

---

### TASK 6 — Build the History Page

**File: `frontend\src\pages\HistoryPage.tsx`** (replace placeholder):

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listSessions, deleteSession } from "../api/chat.api";
import type { ChatSession } from "../types/chat.types";
import Button from "../components/ui/Button";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    listSessions().then(setSessions).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this chat session?")) return;
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate("/documents")}>← Documents</Button>
        <h1>Chat History</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {loading && <p className="text-muted text-sm">Loading…</p>}
        {!loading && sessions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted">No chat history yet.</p>
            <Button className="mt-4" onClick={() => navigate("/documents")}>
              Start a Chat
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => navigate(`/chat/${session.id}`)}
              className="bg-white border border-slate-200 rounded-lg px-4 py-3
                         flex items-center justify-between gap-4 cursor-pointer
                         hover:border-primary hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{session.title}</p>
                <p className="text-xs text-muted mt-0.5">
                  {formatDate(session.created_at)}
                  {" · "}
                  {session.document_ids.length} document{session.document_ids.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button variant="danger" onClick={e => handleDelete(session.id, e)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
```

---

### TASK 7 — Update Router with Real Pages

**Replace `frontend\src\router.tsx`** entirely with the final version using all real pages:

```typescript
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ReactNode } from "react";
import LoginPage     from "./pages/LoginPage";
import RegisterPage  from "./pages/RegisterPage";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage      from "./pages/ChatPage";
import HistoryPage   from "./pages/HistoryPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  { path: "/",         element: <Navigate to="/login" replace /> },
  { path: "/login",    element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/documents",
    element: <ProtectedRoute><DocumentsPage /></ProtectedRoute>,
  },
  {
    path: "/chat",
    element: <ProtectedRoute><ChatPage /></ProtectedRoute>,
  },
  {
    path: "/chat/:sessionId",
    element: <ProtectedRoute><ChatPage /></ProtectedRoute>,
  },
  {
    path: "/history",
    element: <ProtectedRoute><HistoryPage /></ProtectedRoute>,
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
```

---

### DAY 4 END-OF-DAY VERIFICATION CHECKLIST

- [ ] Log in → navigate to Documents page — Documents page loads with full TailwindCSS styling
- [ ] Upload the legal PDF from `C:\Users\DELL\Desktop\Legal-Ai-Assistant\PDF\Legal_AI_Assistant_Final_Project_ABS.pdf`
- [ ] Document appears with green "ready" badge
- [ ] Click "Chat" on the document card — opens Chat page with that document pre-selected
- [ ] Ask: *"What is the force majeure clause?"* — answer appears in the chat window
- [ ] Assistant answer shows a "View X sources" link
- [ ] Clicking "View X sources" opens the Citation Panel on the right with document name, page number, and excerpt
- [ ] Closing the citation panel (×) hides it cleanly
- [ ] Loading state shows "Searching documents…" while waiting for LLM response
- [ ] Ask 3 more questions — chat history scrolls correctly
- [ ] Refresh the page — chat history reloads from the backend
- [ ] Navigate to History page — session appears with the first question as title
- [ ] Click session in History — opens that chat with its messages intact
- [ ] Delete session from History — it disappears from the list
- [ ] All pages are styled consistently with TailwindCSS: spacing, colors, hover states, empty states
