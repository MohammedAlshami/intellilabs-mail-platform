"use client";
import * as React from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  toolCalls?: { name: string; args: string; result?: string }[];
}

interface AiPanelContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const AiPanelContext = React.createContext<AiPanelContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
  messages: [],
  setMessages: () => {},
});

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const toggle = React.useCallback(() => setOpen((v) => !v), []);
  const close = React.useCallback(() => setOpen(false), []);

  const value = React.useMemo(
    () => ({ open, toggle, close, messages, setMessages }),
    [open, toggle, close, messages, setMessages]
  );

  return <AiPanelContext.Provider value={value}>{children}</AiPanelContext.Provider>;
}

export function useAiPanel() {
  return React.useContext(AiPanelContext);
}
