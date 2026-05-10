import client from "./client";
import type { ChatSession, ChatMessage, Citation } from "../types/chat.types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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

/**
 * Streaming message send — uses native fetch with ReadableStream.
 * Parses SSE events from the backend /stream endpoint.
 *
 * @param sessionId   Active chat session ID
 * @param content     User message text
 * @param onToken     Called for each streamed token (append to UI)
 * @param onCitations Called once when citations payload arrives
 * @param onDone      Called when stream completes
 * @param onError     Called on network or server error
 */
export async function streamMessage(
  sessionId: string,
  content: string,
  onToken: (token: string) => void,
  onCitations: (citations: Citation[]) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const token = localStorage.getItem("access_token");
  const url   = `${BASE_URL}/api/v1/chat/sessions/${sessionId}/stream`;

  let response: Response;
  try {
    response = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });
  } catch {
    onError("Network error: could not reach the server.");
    return;
  }

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    onError(`Server error: ${response.status}`);
    return;
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let   buffer  = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split buffer on double-newline (SSE event delimiter)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";   // keep incomplete last chunk in buffer

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;

      const payload = line.slice("data: ".length);

      if (payload.startsWith("[CITATIONS]")) {
        try {
          const citations: Citation[] = JSON.parse(payload.slice("[CITATIONS]".length));
          onCitations(citations);
        } catch { /* ignore parse error */ }
      } else if (payload === "[DONE]") {
        onDone();
        return;
      } else if (payload.startsWith("[ERROR]")) {
        onError(payload.slice("[ERROR] ".length).trim());
        return;
      } else {
        // Regular token — unescape newlines encoded by backend
        onToken(payload.replace(/\\n/g, "\n"));
      }
    }
  }

  onDone();
}

