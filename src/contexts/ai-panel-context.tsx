"use client";
import * as React from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  toolCalls?: { name: string; args: string; result?: string }[];
}

interface ComposeData {
  to?: string;
  subject?: string;
  body?: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}

interface AiPanelContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  composeData: ComposeData | null;
  setComposeData: (data: ComposeData | null) => void;
  clearComposeData: () => void;
}

const defaultContext = {
  open: false,
  toggle: () => {},
  close: () => {},
  messages: [],
  setMessages: () => {},
  composeData: null as ComposeData | null,
  setComposeData: () => {},
  clearComposeData: () => {},
};

const AiPanelContext = React.createContext<AiPanelContextValue>(defaultContext);

function getSavedMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("ai_chat_messages");
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function getSavedOpen(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem("ai_chat_open") === "true"; } catch { return false; }
}

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(getSavedOpen);
  const [messages, setMessages] = React.useState<ChatMessage[]>(getSavedMessages);
  const [composeData, setComposeDataState] = React.useState<ComposeData | null>(null);

  React.useEffect(() => {
    try { localStorage.setItem("ai_chat_open", String(open)); } catch {}
  }, [open]);

  React.useEffect(() => {
    try { localStorage.setItem("ai_chat_messages", JSON.stringify(messages)); } catch {}
  }, [messages]);

  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  const close = React.useCallback(() => setOpen(false), []);
  const setComposeData = React.useCallback((data: ComposeData | null) => setComposeDataState(data), []);
  const clearComposeData = React.useCallback(() => setComposeDataState(null), []);

  const value = React.useMemo(
    () => ({ open, toggle, close, messages, setMessages, composeData, setComposeData, clearComposeData }),
    [open, toggle, close, messages, setMessages, composeData, setComposeData, clearComposeData]
  );

  return <AiPanelContext.Provider value={value}>{children}</AiPanelContext.Provider>;
}

export function useAiPanel() {
  return React.useContext(AiPanelContext);
}
