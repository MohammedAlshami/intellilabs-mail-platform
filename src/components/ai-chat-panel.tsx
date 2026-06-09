"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Bot, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiPanel } from "@/contexts/ai-panel-context";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  toolCalls?: { name: string; args: string; result?: string }[];
}

const PAGES = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Mail", path: "/mail" },
  { label: "Campaigns", path: "/campaign" },
  { label: "Email List", path: "/email-list" },
  { label: "Sending History", path: "/sending-history" },
  { label: "Bounce Monitor", path: "/bounce-monitor" },
  { label: "Websites", path: "/websites" },
  { label: "Leads", path: "/leads" },
  { label: "Removal List", path: "/removal-list" },
];

export function AiChatPanel() {
  const { open, close, messages, setMessages } = useAiPanel();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentReasoning, setCurrentReasoning] = useState("");
  const [currentToolCall, setCurrentToolCall] = useState<{ name: string; args: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, currentReasoning, currentToolCall]);

  const handleSend = useCallback(async (message?: PromptInputMessage) => {
    const msg = (message?.text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages(p => [...p, { role: "user", content: msg }]);
    setLoading(true);
    setCurrentReasoning("Thinking about your request...");
    setCurrentToolCall(null);

    // Check for navigation intent
    const lower = msg.toLowerCase();
    const page = PAGES.find(p => lower.includes(p.label.toLowerCase()) || lower.includes(p.path));
    if (page && (lower.includes("go") || lower.includes("open") || lower.includes("navigate") || lower.includes("show"))) {
      setCurrentReasoning("User wants to navigate. Identifying the correct page...");
      await new Promise(r => setTimeout(r, 500));
      setCurrentToolCall({ name: "navigate", args: JSON.stringify({ page: page.label, path: page.path }) });
      await new Promise(r => setTimeout(r, 500));
      setMessages(p => [...p, {
        role: "assistant",
        content: `Navigating to ${page.label}...`,
        toolCalls: [{ name: "navigate", args: JSON.stringify({ page: page.label, path: page.path }), result: "Navigated" }]
      }]);
      setCurrentReasoning("");
      setCurrentToolCall(null);
      setLoading(false);
      setTimeout(() => { router.push(page.path); close(); }, 300);
      return;
    }

    // Call AI
    try {
      setCurrentReasoning("Processing your question and searching for relevant information...");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          availablePages: PAGES.map(p => `${p.label} (${p.path})`).join(", "),
          model: "openai/gpt-5-nano",
          reasoningEffort: "minimal",
        }),
      });
      const data = await res.json();
      setMessages(p => [...p, {
        role: "assistant",
        content: data.reply || "No response.",
        reasoning: data.reasoning || "",
        toolCalls: data.toolCalls || [],
      }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Connection error." }]);
    }
    setCurrentReasoning("");
    setCurrentToolCall(null);
    setLoading(false);
  }, [input, router, close]);

  const startVoiceInput = useCallback(() => {}, []);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border border-sidebar-border bg-sidebar text-sidebar-foreground rounded-xl",
        "transition-[width] duration-300 ease-out my-2 mr-2 h-[calc(100svh-1rem)]",
        open ? "w-[36rem]" : "w-0 hidden"
      )}
    >
      <div className="flex h-full min-w-[36rem] flex-col">
        <div className="flex shrink-0 items-center justify-between px-3 py-2 border-b border-sidebar-border/60">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <span className="text-sm font-medium">AI Assistant</span>
            {loading && <Loader2 className="size-3.5 animate-spin opacity-50" />}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="size-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" title="Clear chat">
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button onClick={close} className="size-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" title="Close">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <Conversation>
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title="AI Assistant"
                  description="Ask me to navigate or answer questions about the platform."
                />
              ) : (
                messages.map((m, i) => (
                  <Message from={m.role} key={i}>
                    <MessageContent>
                      {m.reasoning && (
                        <Reasoning className="w-full mb-3">
                          <ReasoningTrigger />
                          <ReasoningContent>{m.reasoning}</ReasoningContent>
                        </Reasoning>
                      )}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <ChainOfThought className="w-full mb-3" defaultOpen={false}>
                          <ChainOfThoughtHeader />
                          <ChainOfThoughtContent>
                            <div className="space-y-2 px-1 py-1">
                              {m.toolCalls.map((tc, j) => (
                                <ChainOfThoughtStep
                                  key={j}
                                  label={tc.name}
                                  description={`Args: ${tc.args}`}
                                  status={tc.result ? "complete" : "active"}
                                />
                              ))}
                            </div>
                          </ChainOfThoughtContent>
                        </ChainOfThought>
                      )}
                      <MessageResponse>{m.content}</MessageResponse>
                    </MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Live reasoning while streaming */}
          {loading && currentReasoning && (
            <div className="px-1 py-2">
              <Reasoning className="w-full" isStreaming>
                <ReasoningTrigger />
                <ReasoningContent>{currentReasoning}</ReasoningContent>
              </Reasoning>
            </div>
          )}

          {/* Live tool call indicator */}
          {loading && currentToolCall && (
            <div className="px-1 py-2">
              <ChainOfThought className="w-full" defaultOpen>
                <ChainOfThoughtHeader />
                <ChainOfThoughtContent>
                  <div className="space-y-2 px-1 py-1">
                    <ChainOfThoughtStep
                      label={currentToolCall.name}
                      description={`Args: ${currentToolCall.args}`}
                      status="active"
                    />
                  </div>
                </ChainOfThoughtContent>
              </ChainOfThought>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-sidebar-border/60 p-3">
          <PromptInput onSubmit={handleSend}>
            <PromptInputTextarea
              value={input}
              placeholder="Ask me anything..."
              onChange={(e) => setInput(e.currentTarget.value)}
            />
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSubmit status={loading ? "streaming" : "ready"} disabled={!input.trim()} />
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
