import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from "react";
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

const ChatContext = createContext<{ state: ChatState; dispatch: Dispatch<Action> } | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <ChatContext.Provider value={{ state, dispatch }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be inside ChatProvider");
  return ctx;
}
