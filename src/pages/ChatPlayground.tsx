
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowUp, Copy, Check, RotateCcw, ChevronDown, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useModels } from "@/hooks/useModels";
import { apiUrl } from "@/lib/api";

const ChatPlayground = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const chat = useChatHistory();
  const { models, selectedModel, setSelectedModel, loading: modelsLoading } = useModels();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevActiveIdRef = useRef<string | null>(null);

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

  // Voice input using Web Speech API
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let baseInput = input;
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(baseInput + finalTranscript + interimTranscript);
      if (finalTranscript) {
        baseInput += finalTranscript;
      }
      autoResize();
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
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
                    <div className="bg-primary text-primary-foreground text-[15px] leading-relaxed px-4 py-2.5 rounded-3xl rounded-br-lg max-w-[85%]">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {msg.content}
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
          <div className="relative bg-card border border-border rounded-2xl focus-within:border-ring/40 transition-colors">
            {/* Model selector row */}
            <div className="flex items-center px-3 pt-2.5 pb-0">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                >
                  <span className="font-medium truncate max-w-[180px]">
                    {modelsLoading ? "Loading..." : selectedModel || "Select model"}
                  </span>
                  <ChevronDown size={12} className={cn("transition-transform", showModelDropdown && "rotate-180")} />
                </button>
                {showModelDropdown && models.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[13px] hover:bg-secondary transition-colors truncate",
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
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-2.5 pr-20 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {/* Buttons row */}
            <div className="absolute right-3 bottom-3 flex items-center gap-1">
              {/* Voice input */}
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-1 rounded-md transition-all",
                  isListening
                    ? "text-destructive animate-pulse"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                )}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "transition-all",
                  input.trim() && !isLoading
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground/20"
                )}
              >
                <ArrowUp size={20} />
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
