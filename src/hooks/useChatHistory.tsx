
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatHistoryContextType {
  sessions: ChatSession[];
  activeId: string | null;
  activeSession: ChatSession | null;
  setActiveId: (id: string | null) => void;
  createSession: () => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  addMessage: (msg: ChatMessage, targetId?: string) => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | null>(null);

const STORAGE_KEY = "pulse-chat-sessions";
const ACTIVE_KEY = "pulse-active-chat";

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: ChatSession[] = raw ? JSON.parse(raw) : [];
    // Cleanup legacy placeholder messages created before API integration.
    return parsed.map((s) => ({
      ...s,
      messages: (s.messages || []).filter((m) => {
        if (!m?.content) return true;
        return !String(m.content).includes("This is a mock response. Connect your API endpoint to get real completions.");
      }),
    }));
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_KEY);
  });

  useEffect(() => {
    if (activeId && !sessions.some((s) => s.id === activeId)) {
      setActiveId(null);
    }
  }, [activeId, sessions]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  const createSession = useCallback((): string => {
    const id = crypto.randomUUID();
    const session: ChatSession = {
      id,
      title: "New chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveId((prev) => (prev === id ? null : prev));
    },
    []
  );

  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title, updatedAt: Date.now() } : s))
    );
  }, []);

  const addMessage = useCallback(
    (msg: ChatMessage, targetId?: string) => {
      setSessions((prev) => {
        const sessionId = targetId || prev.find(s => s.id === (targetId || activeId))?.id || activeId;
        if (!sessionId) return prev;
        return prev.map((s) => {
          if (s.id !== sessionId) return s;
          const messages = [...s.messages, msg];
          const title =
            s.messages.length === 0 && msg.role === "user"
              ? msg.content.slice(0, 40) + (msg.content.length > 40 ? "..." : "")
              : s.title;
          return { ...s, messages, title, updatedAt: Date.now() };
        });
      });
    },
    [activeId]
  );

  const value: ChatHistoryContextType = {
    sessions,
    activeId,
    activeSession,
    setActiveId,
    createSession,
    deleteSession,
    renameSession,
    addMessage,
  };

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory(): ChatHistoryContextType {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used within ChatHistoryProvider");
  return ctx;
}
