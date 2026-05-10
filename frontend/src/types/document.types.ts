export interface Document {
  id: string;
  filename: string;
  file_size: number;
  page_count: number;
  status: "processing" | "ready" | "failed";
  created_at: string;
}
