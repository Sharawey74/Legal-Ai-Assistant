import client from "./client";
import type { Document } from "../types/document.types";

export const listDocuments = (): Promise<Document[]> =>
  client.get<Document[]>("/documents").then(r => r.data);

export const uploadDocument = async (file: File): Promise<Document> => {
  const form = new FormData();
  form.append("file", file);

  const token = localStorage.getItem("access_token");
  const BASE_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:8000";

  const res = await fetch(`${BASE_URL}/api/v1/documents`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw { response: { data: errorData } };
  }

  return res.json();
};

export const deleteDocument = (id: string): Promise<void> =>
  client.delete(`/documents/${id}`).then(() => undefined);
