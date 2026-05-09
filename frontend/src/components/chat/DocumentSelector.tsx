import { useEffect, useState } from "react";
import { listDocuments } from "../../api/documents.api";
import type { Document } from "../../types/document.types";

interface Props {
  selectedIds:  string[];
  onChange:     (ids: string[]) => void;
  disabled?:    boolean;
}

export default function DocumentSelector({ selectedIds, onChange, disabled }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocuments()
      .then(all => setDocs(all.filter(d => d.status === "ready")))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    if (disabled) return;
    onChange(
      selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="material-symbols-outlined animate-spin text-indigo-400 text-[22px]">progress_activity</span>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center text-center px-4 py-8 gap-2">
        <span className="material-symbols-outlined text-slate-600 text-[28px]">description</span>
        <p className="text-xs text-slate-500 leading-relaxed">No ready documents yet. Upload some from the Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-white/5">
          <span className="text-[11px] text-slate-500">{selectedIds.length} selected</span>
          {!disabled && (
            <button
              onClick={() => onChange([])}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {docs.map(doc => {
        const isSelected = selectedIds.includes(doc.id);
        return (
          <label
            key={doc.id}
            className={`
              flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
              border group
              ${disabled ? "opacity-60 cursor-default" : ""}
              ${isSelected
                ? "bg-indigo-500/10 border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/8"
              }
            `}
          >
            {/* Custom checkbox */}
            <div
              className={`
                mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center
                transition-all duration-200
                ${isSelected
                  ? "bg-indigo-600 border-indigo-500 shadow-sm shadow-indigo-500/30"
                  : "bg-white/5 border-white/20 group-hover:border-white/30"
                }
              `}
            >
              {isSelected && (
                <span className="material-symbols-outlined text-white text-[12px]">check</span>
              )}
            </div>

            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(doc.id)}
              disabled={disabled}
              className="hidden"
            />

            <span
              className={`text-xs leading-snug break-all transition-colors font-medium ${
                isSelected ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-300"
              }`}
            >
              {doc.filename}
            </span>
          </label>
        );
      })}
    </div>
  );
}
