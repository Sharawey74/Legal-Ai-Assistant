import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Document } from "../../types/document.types";
import StatusBadge from "./StatusBadge";
import { deleteDocument } from "../../api/documents.api";

interface Props {
  document: Document;
  onDeleted: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentCard({ document, onDeleted }: Props) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${document.filename}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteDocument(document.id);
      onDeleted(document.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group relative rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-indigo-500/15 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/8 overflow-hidden flex flex-col">
      {/* Top accent on hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/0 group-hover:via-indigo-500/30 to-transparent transition-all duration-300" />

      <div className="flex items-start gap-3 p-5 flex-1">
        {/* Icon */}
        <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-400 text-[18px]">description</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-snug" title={document.filename}>
            {document.filename}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-md font-medium">
              {formatBytes(document.file_size)}
            </span>
            {document.page_count > 0 && (
              <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-md font-medium">
                {document.page_count} {document.page_count === 1 ? "page" : "pages"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
        <StatusBadge status={document.status} />
        <div className="flex items-center gap-1.5">
          {document.status === "ready" && (
            <button
              onClick={() => navigate("/chat", { state: { documentId: document.id } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all duration-200 active:scale-[0.97] shadow-sm shadow-indigo-500/20"
            >
              <span className="material-symbols-outlined text-[14px]">forum</span>
              Chat
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 active:scale-95 disabled:opacity-50"
            aria-label="Delete document"
          >
            <span className="material-symbols-outlined text-[16px]">
              {deleting ? "progress_activity" : "delete"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
