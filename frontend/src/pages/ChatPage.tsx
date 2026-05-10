import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import { createSession, getMessages, streamMessage, listSessions } from "../api/chat.api";
import type { Citation } from "../types/chat.types";
import MessageBubble    from "../components/chat/MessageBubble";
import ChatInput        from "../components/chat/ChatInput";
import CitationPanel    from "../components/chat/CitationPanel";
import DocumentSelector from "../components/chat/DocumentSelector";
import ReactMarkdown    from "react-markdown";

export default function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const location  = useLocation();
  const navigate  = useNavigate();
  const { state, dispatch } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  // Streaming state
  const [streamingToken, setStreamingToken] = useState<string>("");
  const [isStreaming, setIsStreaming]        = useState(false);
  const [isContextCollapsed, setIsContextCollapsed] = useState(false);

  useEffect(() => {
    dispatch({ type: "CLEAR" });
    const preselected = (location.state as any)?.documentId;
    if (preselected) dispatch({ type: "SET_DOCS", payload: [preselected] });

    if (routeSessionId) {
      dispatch({ type: "SET_SESSION", payload: routeSessionId });
      getMessages(routeSessionId).then(msgs =>
        dispatch({ type: "SET_MESSAGES", payload: msgs })
      );
      listSessions().then(sessions => {
        const session = sessions.find(s => s.id === routeSessionId);
        if (session?.document_ids) {
          dispatch({ type: "SET_DOCS", payload: session.document_ids });
        }
      });
    }
  }, [routeSessionId, location.state, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, streamingToken]);

  async function handleSend(content: string, isThinkingMode: boolean) {
    if (!state.sessionId && state.selectedDocumentIds.length === 0) {
      alert("Please select at least one document before asking a question.");
      return;
    }

    // Optimistically add user message
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      let sid = state.sessionId;
      if (!sid) {
        const session = await createSession(state.selectedDocumentIds);
        sid = session.id;
        dispatch({ type: "SET_SESSION", payload: sid });
        navigate(`/chat/${sid}`, { replace: true });
      }

      // Add user message optimistically (backend also saves it)
      dispatch({ type: "ADD_MESSAGE", payload: {
        id: "temp-user", session_id: sid, role: "user",
        content, citations: [], created_at: new Date().toISOString(),
      }});

      // Begin streaming response
      setIsStreaming(true);
      setStreamingToken("");
      dispatch({ type: "SET_LOADING", payload: false });

      await streamMessage(
        sid,
        content,
        isThinkingMode,
        // onToken — append each token to the streaming bubble
        (token) => setStreamingToken(prev => prev + token),
        // onCitations — auto-show citation panel
        (citations) => { if (citations.length > 0) setActiveCitations(citations); },
        // onDone — reload messages from DB (includes saved assistant message)
        async () => {
          setIsStreaming(false);
          setStreamingToken("");
          const msgs = await getMessages(sid!);
          dispatch({ type: "SET_MESSAGES", payload: msgs });
        },
        // onError — show error in stream bubble
        (errMsg) => {
          setIsStreaming(false);
          setStreamingToken(`[Error: ${errMsg}]`);
          setTimeout(() => setStreamingToken(""), 4000);
        },
      );

    } catch {
      // Fallback to non-streaming on failure
      dispatch({ type: "SET_LOADING", payload: false });
      setIsStreaming(false);
      setStreamingToken("");
    }
  }

  return (
    <div className="h-full flex bg-[#0b1326] overflow-hidden text-white">

      {/* ── Left sidebar: Document Selector ── */}
      <aside 
        className={`hidden md:flex shrink-0 flex-col border-r border-white/5 bg-[#080f1e] z-20 relative transition-all duration-300 ease-in-out ${
          isContextCollapsed ? "w-10" : "w-72"
        }`}
      >
        <button 
          onClick={() => setIsContextCollapsed(!isContextCollapsed)}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-14 bg-[#080f1e] border border-white/10 rounded-full flex items-center justify-center hover:bg-white/5 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 transition-all z-30 shadow-lg"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isContextCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>

        {!isContextCollapsed ? (
          <>
            <div className="px-5 pt-10 pb-5 border-b border-white/5 w-72">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <p className="text-xs font-bold tracking-[0.15em] text-indigo-400 uppercase">Active Context</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {state.sessionId
                  ? "Context is locked for this active session."
                  : "Select documents to include in the AI's retrieval pipeline."}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3 w-72">
              <DocumentSelector
                selectedIds={state.selectedDocumentIds}
                onChange={ids => dispatch({ type: "SET_DOCS", payload: ids })}
                disabled={!!state.sessionId}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-500 mt-10 h-full w-10">
            <span className="material-symbols-outlined text-[16px] text-indigo-500/50">inventory_2</span>
            <span className="text-[10px] font-bold tracking-widest text-indigo-500/50 uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>Context</span>
          </div>
        )}
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-indigo-600/6 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-violet-600/5 blur-[100px]" />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto relative z-10 px-4 md:px-8 py-8">
          <div className="max-w-3xl mx-auto w-full">

            {/* Empty state */}
            {state.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center mt-16">
                {/* Logo icon */}
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/10">
                  <span className="material-symbols-outlined text-indigo-400 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">How can I help you today?</h2>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                  Select documents from the left panel and ask a legal question. I'll search the texts and provide cited answers.
                </p>
                {/* Prompt suggestions */}
                <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                  {[
                    { icon: "search", text: "Summarize key clauses" },
                    { icon: "balance",  text: "Compare contract terms" },
                    { icon: "gavel",    text: "Find liability provisions" },
                    { icon: "policy",   text: "Extract compliance rules" },
                  ].map(({ icon, text }) => (
                    <button
                      key={text}
                      onClick={() => handleSend(text, false)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-indigo-500/20 text-sm text-slate-400 hover:text-white transition-all duration-200 text-left active:scale-[0.98] group"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0">{icon}</span>
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {state.messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} onViewSources={setActiveCitations} />
            ))}

            {/* Preparing/retrieving context loading bubble */}
            {state.loading && (
              <div className="flex justify-start mb-6">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mt-1 shadow-md shadow-indigo-500/30">
                    <span className="material-symbols-outlined text-white text-[16px] animate-spin">progress_activity</span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl rounded-bl-sm px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">Retrieving legal context…</p>
                  </div>
                </div>
              </div>
            )}

            {/* Live streaming bubble — shows tokens as they arrive */}
            {isStreaming && (
              <div className="flex justify-start mb-6">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mt-1 shadow-md shadow-indigo-500/30 border border-indigo-400/20">
                    <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-indigo-500/20 text-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed relative">
                    {/* Pulsing indigo top-line while streaming */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent rounded-t-2xl animate-pulse" />
                    <div className="markdown-prose">
                      {streamingToken ? (
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
                          {streamingToken
                            .replace(/<think>([\s\S]*?)(<\/think>|$)/g, (_, p1) => 
                              '> **💭 AI Reasoning Process:**\n' + p1.split('\n').map((l: string) => `> ${l}`).join('\n') + '\n\n'
                            )
                            .replace(/\[Doc:\s*(.*?),\s*Page:\s*(\d+)\]/g, '[Doc: $1, Page: $2](#citation)')}
                        </ReactMarkdown>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      )}
                    </div>
                    {/* Blinking cursor while streaming */}
                    {streamingToken && (
                      <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-6" />
          </div>
        </div>

        {/* Fade + Input */}
        <div className="relative z-20">
          <div className="absolute bottom-full inset-x-0 h-20 bg-gradient-to-t from-[#0b1326] to-transparent pointer-events-none" />
          <div className="px-4 md:px-8 pb-6 pt-2">
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={handleSend} disabled={state.loading} />
            </div>
          </div>
        </div>
      </main>

      {/* ── Right panel: Citations ── */}
      {activeCitations.length > 0 && (
        <div className="absolute inset-y-0 right-0 w-96 bg-[#080f1e] border-l border-white/5 shadow-2xl z-30 flex flex-col">
          <CitationPanel citations={activeCitations} onClose={() => setActiveCitations([])} />
        </div>
      )}
    </div>
  );
}
