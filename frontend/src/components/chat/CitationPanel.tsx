import type { Citation } from "../../types/chat.types";

interface Props {
  citations: Citation[];
  onClose: () => void;
}

export default function CitationPanel({ citations, onClose }: Props) {
  if (citations.length === 0) return null;

  return (
    <aside className="h-full flex flex-col bg-[#080f1e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/2 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-400 text-[16px]">menu_book</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Context Sources</h2>
            <p className="text-[11px] text-slate-500">{citations.length} reference{citations.length !== 1 ? "s" : ""} found</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200 active:scale-95"
          aria-label="Close sources panel"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Citations list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {citations.map((c, i) => (
          <div
            key={i}
            className="group rounded-xl border border-white/8 bg-white/4 hover:border-indigo-500/20 hover:bg-white/6 transition-all duration-200 overflow-hidden"
          >
            {/* Citation header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/3">
              <span className="text-xs font-bold text-slate-400 truncate flex items-center gap-1.5" title={c.document_name}>
                <span className="material-symbols-outlined text-[14px] text-indigo-400 shrink-0">description</span>
                {c.document_name}
              </span>
              <span className="ml-2 shrink-0 text-[11px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                Pg {c.page_number}
              </span>
            </div>

            {/* Excerpt */}
            <div className="relative px-4 py-3">
              {/* Left accent bar */}
              <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-indigo-500/30 group-hover:bg-indigo-400 transition-colors rounded-r-full" />
              <p className="text-xs text-slate-400 leading-relaxed pl-3 italic">"{c.excerpt}"</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
