import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listSessions, deleteSession } from "../api/chat.api";
import type { ChatSession } from "../types/chat.types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listSessions().then(setSessions).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this chat session?")) return;
    setDeletingId(id);
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-6 bg-gradient-to-r from-violet-500 to-transparent" />
          <span className="text-xs font-bold tracking-[0.15em] text-violet-400 uppercase">Audit Trail</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Session History</h1>
        <p className="text-slate-400 mt-1 text-sm">Review and manage your previous case research interactions.</p>
      </div>

      <section>
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-4xl">progress_activity</span>
            <span className="text-sm text-slate-500">Loading sessions…</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-500 text-[28px]">history</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">No chat history yet</h3>
            <p className="text-sm text-slate-500 max-w-xs text-center mb-5">
              Start a new conversation from the Documents dashboard to see it appear here.
            </p>
            <button
              onClick={() => navigate("/documents")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all duration-200 active:scale-[0.98] shadow-lg shadow-indigo-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Go to Documents
            </button>
          </div>
        )}

        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <div
              key={session.id}
              onClick={() => navigate(`/chat/${session.id}`)}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="group relative rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 hover:border-indigo-500/20 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10 overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />

              <div className="relative flex items-center gap-4 p-5">
                {/* Icon */}
                <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-400 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                      {formatDate(session.created_at)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[13px]">description</span>
                      {session.document_ids.length} doc{session.document_ids.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <span className="material-symbols-outlined text-slate-700 group-hover:text-indigo-400 transition-all duration-200 group-hover:translate-x-1 text-[20px] shrink-0">
                  arrow_forward
                </span>

                {/* Delete button */}
                <button
                  onClick={e => handleDelete(session.id, e)}
                  disabled={deletingId === session.id}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 active:scale-95 disabled:opacity-50"
                  aria-label="Delete session"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {deletingId === session.id ? "progress_activity" : "delete"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
