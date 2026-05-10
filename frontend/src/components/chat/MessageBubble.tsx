import type { ChatMessage, Citation } from "../../types/chat.types";

interface Props {
  message: ChatMessage;
  onViewSources: (citations: Citation[]) => void;
}

export default function MessageBubble({ message, onViewSources }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-5 group`}>
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} max-w-[85%]`}>

        {/* Avatar */}
        {!isUser && (
          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mt-1 shadow-md shadow-indigo-500/30 border border-indigo-400/20">
            <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative px-4 py-3 text-sm leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-br-sm shadow-indigo-500/20"
              : "bg-white/5 backdrop-blur-md border border-white/10 text-slate-200 rounded-2xl rounded-bl-sm"
            }
          `}
        >
          {/* User message shimmer line */}
          {isUser && (
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-2xl" />
          )}

          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Citations button */}
          {!isUser && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => onViewSources(message.citations)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px]">menu_book</span>
                View {message.citations.length} source{message.citations.length > 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
