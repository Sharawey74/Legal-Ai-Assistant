import type { ChatMessage, Citation } from "../../types/chat.types";

interface Props {
  message: ChatMessage;
  onViewSources: (citations: Citation[]) => void;
}

import ReactMarkdown from "react-markdown";

export default function MessageBubble({ message, onViewSources }: Props) {
  const isUser = message.role === "user";

  const formattedContent = !isUser 
    ? message.content
        .replace(/<think>([\s\S]*?)<\/think>/g, (_, p1) => 
          '> **💭 AI Reasoning Process:**\n' + p1.split('\n').map((l: string) => `> ${l}`).join('\n') + '\n\n'
        )
        .replace(/\[Doc:\s*(.*?),\s*Page:\s*(\d+)\]/g, '[Doc: $1, Page: $2](#citation)')
    : message.content;

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

          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-prose">
              <ReactMarkdown
                components={{
                  strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 text-slate-300" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 text-slate-300 leading-relaxed last:mb-0" {...props} />,
                  h2: ({node, ...props}) => <h3 className="text-white font-semibold text-base mb-1 mt-4" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-white font-semibold text-base mb-1 mt-4" {...props} />,
                  a: ({node, href, children, ...props}) => {
                    if (href === "#citation") {
                      return <span className="inline-flex items-center bg-indigo-900 text-indigo-300 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full mx-1 border border-indigo-500/30">{children}</span>;
                    }
                    return <a href={href} className="text-indigo-400 hover:underline" {...props}>{children}</a>;
                  },
                  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-indigo-500/50 pl-4 py-2 my-3 bg-indigo-500/5 text-indigo-200/80 text-xs italic rounded-r-lg" {...props} />
                }}
              >
                {formattedContent}
              </ReactMarkdown>
            </div>
          )}

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
