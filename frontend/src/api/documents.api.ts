import client from "./client";
import type { Document } from "../types/document.types";

export const listDocuments = (): Promise<Document[]> =>
  client.get<Document[]>("/documents").then(r => r.data);

export const uploadDocument = (file: File): Promise<Document> => {
  const form = new FormData();
  form.append("file", file);
  return client.post<Document>("/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};

export const deleteDocument = (id: string): Promise<void> =>
  client.delete(`/documents/${id}`).then(() => undefined);
