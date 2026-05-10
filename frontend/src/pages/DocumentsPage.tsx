import { useState, useEffect } from "react";
import { listDocuments } from "../api/documents.api";
import type { Document } from "../types/document.types";
import DocumentCard from "../components/documents/DocumentCard";
import UploadDropzone from "../components/documents/UploadDropzone";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => setError("Failed to load documents"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-6 bg-gradient-to-r from-indigo-500 to-transparent" />
          <span className="text-xs font-bold tracking-[0.15em] text-indigo-400 uppercase">Corpus Manager</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Document Library</h1>
        <p className="text-slate-400 mt-1 text-sm">Manage your enterprise legal corpus for AI-powered retrieval.</p>
      </div>

      {/* Upload Section */}
      <section className="relative rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl overflow-hidden shadow-xl">
        {/* Top glow line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        {/* Ambient blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-indigo-600/8 blur-[80px] pointer-events-none" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">cloud_upload</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload Documents</h2>
              <p className="text-xs text-slate-400">Add legal texts to your secure enterprise corpus.</p>
            </div>
          </div>
          <UploadDropzone onUploaded={doc => setDocuments(prev => [doc, ...prev])} />
        </div>
      </section>

      {/* Documents Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Your Documents
            <span className="ml-2 text-sm font-normal text-slate-500">({documents.length})</span>
          </h2>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-4xl">progress_activity</span>
              <span className="text-sm text-slate-500">Loading documents…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {!loading && documents.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500 text-[28px]">description</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">No documents yet</h3>
            <p className="text-sm text-slate-500 max-w-xs text-center">Upload your first legal document above to begin interacting with the AI.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDeleted={id => setDocuments(prev => prev.filter(d => d.id !== id))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
