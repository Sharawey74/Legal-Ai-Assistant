import { useState, type KeyboardEvent, useRef, useEffect } from "react";

interface Props {
  onSend: (content: string, isThinkingMode: boolean) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, isThinkingMode);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="relative">
      {/* Glass input container */}
      <div
        className={`
          relative flex items-end gap-3 rounded-2xl border bg-white/5 backdrop-blur-xl
          shadow-xl shadow-black/20 transition-all duration-300 p-3
          ${disabled
            ? "border-white/5 opacity-70"
            : value.trim()
              ? "border-indigo-500/40 ring-1 ring-indigo-500/20"
              : "border-white/10 hover:border-white/20 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20"
          }
        `}
      >
        {/* Top glow line on focus */}
        <div className={`absolute top-0 inset-x-0 h-px rounded-t-2xl transition-opacity duration-300 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent ${value.trim() ? "opacity-100" : "opacity-0"}`} />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Ask a legal question about your documents… (Ctrl+Enter to send)"
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-slate-600 outline-none leading-relaxed disabled:cursor-not-allowed max-h-48 overflow-y-auto py-1 px-2"
        />

        {/* Thinking Mode Toggle */}
        <button
          onClick={() => setIsThinkingMode(!isThinkingMode)}
          disabled={disabled}
          title="Enable Deep Thinking Mode"
          className={`
            shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200
            ${isThinkingMode 
              ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-inner shadow-indigo-500/20" 
              : "bg-white/5 text-slate-500 border-white/10 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-white/10"
            }
          `}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isThinkingMode ? "psychology" : "psychology_alt"}
          </span>
        </button>

        {/* Send button */}
        <button
          onClick={submit}
          disabled={!canSend}
          className={`
            shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
            transition-all duration-200 active:scale-[0.92]
            ${canSend
              ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
              : "bg-white/5 text-slate-600 cursor-not-allowed"
            }
          `}
          aria-label="Send message"
        >
          {disabled ? (
            <span className="material-symbols-outlined text-[18px] animate-spin text-indigo-400">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">send</span>
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] text-slate-700 mt-2">
        Ctrl+Enter to send · AI responses are cited from your documents
      </p>
    </div>
  );
}
