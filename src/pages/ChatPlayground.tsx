
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowUp, Copy, Check, RotateCcw, ChevronDown, Mic, MicOff, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useModels } from "@/hooks/useModels";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { apiUrl } from "@/lib/api";

const CodeBlock = ({ children, className }: { children: any, className?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "text";
  const code = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-4">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border border-border rounded-t-lg text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={cn("overflow-x-auto p-4 bg-muted/30 border-x border-b border-border rounded-b-lg font-mono text-[13px] leading-relaxed", className)}>
        {children}
      </pre>
    </div>
  );
};

const ChatPlayground = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const chat = useChatHistory();
  const { models, selectedModel, setSelectedModel, loading: modelsLoading } = useModels();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevActiveIdRef = useRef<string | null>(null);

  const { isListening, toggleVoice } = useVoiceInput((transcript) => {
    setInput(prev => prev + (prev ? " " : "") + transcript);
    setTimeout(autoResize, 0);
  });

  // Sync URL chatId to active session
  useEffect(() => {
    if (chatId) {
      if (chatId !== chat.activeId) {
        const session = chat.sessions.find((s) => s.id === chatId);
        if (session) {
          chat.setActiveId(chatId);
        }
      }
    } else {
      // No chatId in URL (e.g. navigated to /), clear active session
      chat.setActiveId(null);
    }
  }, [chatId]);

  const messages = chat.activeSession?.messages || [];

  // Rough token estimation (heuristic: ~4 chars per token)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const historyTokens = messages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
  const inputTokens = estimateTokens(input);
  const totalTokens = historyTokens + inputTokens;
  const isOverLimit = totalTokens > 20000;

  useLayoutEffect(() => {
    const changedChat = prevActiveIdRef.current !== chat.activeId;
    prevActiveIdRef.current = chat.activeId;
    const behavior: ScrollBehavior = changedChat ? "auto" : "smooth";
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, [chat.activeId, messages.length, isLoading]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    let sessionId = chat.activeId;
    if (!sessionId) {
      sessionId = chat.createSession();
      navigate(`/chat/${sessionId}`, { replace: true });
    }
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    chat.addMessage({ role: "user", content, timestamp: Date.now() }, sessionId);
    setIsLoading(true);

    const allMessages = [
      ...(chat.sessions.find(s => s.id === sessionId)?.messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

    fetch(apiUrl("/v1/chat/completions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: allMessages,
        max_tokens: 20000,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const reply = data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
        chat.addMessage(
          { role: "assistant", content: reply, timestamp: Date.now() },
          sessionId!
        );
      })
      .catch(err => {
        chat.addMessage(
          { role: "assistant", content: `Error: ${err.message}`, timestamp: Date.now() },
          sessionId!
        );
      })
      .finally(() => setIsLoading(false));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Ambient glow background — uses current accent/primary color */}
      <div className="pointer-events-none absolute inset-0 z-0 dark:opacity-40 opacity-20 transition-opacity duration-700">
        <div
          className="absolute bottom-[-30%] left-[10%] w-[70%] h-[80%] rounded-full blur-[120px]"
          style={{ background: "hsl(var(--primary) / 0.45)" }}
        />
        <div
          className="absolute bottom-[-20%] right-[5%] w-[50%] h-[60%] rounded-full blur-[100px]"
          style={{ background: "hsl(var(--primary) / 0.3)" }}
        />
        <div
          className="absolute bottom-[-10%] left-[30%] w-[40%] h-[50%] rounded-full blur-[80px]"
          style={{ background: "hsl(350 89% 60% / 0.2)" }}
        />
      </div>
      {/* Model selector at top-left - repositioned to be fixed/persistent */}
      <div className="absolute top-4 left-4 z-50">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-1.5 text-[14px] font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-xl border border-border transition-all backdrop-blur-sm bg-background/50"
          >
            <span>
              {modelsLoading ? "Loading..." : models.find(m => m.id === selectedModel)?.name || selectedModel || "Select model"}
            </span>
            <ChevronDown size={14} className={cn("transition-transform opacity-60", showModelDropdown && "rotate-180")} />
          </button>
          {showModelDropdown && models.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-50">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setShowModelDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-[13px] hover:bg-secondary transition-colors truncate",
                    m.id === selectedModel ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto relative z-10">

        {messages.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <h2 className="font-display text-2xl mb-2 text-foreground">Hatke Robot</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              What are we building, fixing, or analyzing today?
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-lg">
              {["Analyze this dataset for me", "Explain how transformers work", "Write a Python script", "Debug my API response"].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-[13px] px-4 py-2 rounded-full border border-border dark:border-muted-foreground/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-[720px] w-full mx-auto px-4 py-6 space-y-6 mt-auto">
            {messages.map((msg, i) => (
              <div key={i} className="group animate-fade-in">
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-primary/80 dark:bg-primary/60 text-primary-foreground text-[15px] leading-relaxed px-4 py-2.5 rounded-3xl rounded-br-lg max-w-[85%] shadow-sm backdrop-blur-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[15px] leading-relaxed text-foreground prose prose-sm dark:prose-invert prose-headings:font-display prose-headings:font-semibold prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline ? (
                              <CodeBlock className={className} {...props}>
                                {children}
                              </CodeBlock>
                            ) : (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                {children}
                              </code>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="overflow-x-auto my-4">
                                <table className="w-full border-collapse border border-border rounded-lg overflow-hidden text-sm">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          th({ children }) {
                            return <th className="border border-border bg-muted/50 px-4 py-2 text-left font-medium">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="border border-border px-4 py-2">{children}</td>;
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(msg.content, i)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Copy">
                        {copiedIdx === i ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Regenerate">
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="animate-fade-in">
                <div className="flex gap-1.5 py-2">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 shrink-0 relative z-10">
        <div className="max-w-[720px] mx-auto">
          <div className="relative bg-card border border-border rounded-2xl focus-within:border-ring/40 transition-all flex items-end shadow-sm">


            {/* Premium Context Limit Warning Pill */}
            {isOverLimit && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 backdrop-blur-md border border-destructive/20 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <AlertCircle size={14} className="text-destructive" />
                  <span className="text-[12px] font-medium text-destructive whitespace-nowrap">
                    Context Limit Reached (20k tokens)
                  </span>
                </div>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-[14px] text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[52px]"
            />
            <div className="flex items-center gap-1.5 pr-3 pb-2">
              {/* Voice input */}
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  isListening
                    ? "text-destructive animate-pulse bg-destructive/10"
                    : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary"
                )}
                disabled={isLoading}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isOverLimit}
                className={cn(
                  "p-2 transition-all duration-300",
                  input.trim() && !isLoading && !isOverLimit
                    ? "text-primary scale-110 drop-shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                    : "text-muted-foreground/20 scale-100"
                )}
              >
                <ArrowUp size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
            Hatke Robot can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPlayground;
