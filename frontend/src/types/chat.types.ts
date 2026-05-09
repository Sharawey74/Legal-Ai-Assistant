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
