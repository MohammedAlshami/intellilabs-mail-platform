"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Trash2, X, EllipsisVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Task, TaskTrigger, TaskContent, TaskItem } from "@/components/ai-elements/task";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  toolCalls?: { name: string; args: string; result?: string }[];
}

export function AiChatPanel() {
  const { open, close, messages, setMessages, setComposeData } = useAiPanel();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [streamingToolCall, setStreamingToolCall] = useState<{ name: string; args: string } | null>(null);
  const [reasoningEffort, setReasoningEffort] = useState("medium");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingReply, streamingReasoning, streamingToolCall]);

  const handleSend = useCallback(async (message?: PromptInputMessage) => {
    const msg = (message?.text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages(p => [...p, { role: "user", content: msg }]);
    setLoading(true);
    setStreamingReply("");
    setStreamingReasoning("");
    setStreamingToolCall(null);

    try {
      // Pass current thread context to AI
      const threadId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null;
      const threadContext = threadId ? `\n[Current thread ID: ${threadId}]` : "";
      const convMessages = [...messages, { role: "user", content: msg + threadContext }];
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convMessages, reasoningEffort }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "reasoning":
                setStreamingReasoning(p => p + data.content);
                break;
              case "text":
                setStreamingReply(p => p + data.content);
                break;
              case "tool_call":
                setStreamingToolCall({ name: data.name, args: JSON.stringify(data.args) });
                break;
              case "result":
                if (data.csv) {
                  const blob = new Blob([data.csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `export_${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
                if (data.toolCall?.tool === "navigate") {
                  setMessages(p => [...p, {
                    role: "assistant",
                    content: data.reply || "",
                    reasoning: data.reasoning || "",
                    toolCalls: [{ name: "navigate", args: JSON.stringify(data.toolCall.args), result: "Navigated" }],
                  }]);
                  setLoading(false);
                  router.push(data.toolCall.args?.path || "/");
                  return;
                }
                const tcs = (data.toolCalls || []).map((tc: any) => ({
                  name: tc.name,
                  args: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args),
                  result: tc.result || "",
                }));
                setMessages(p => [...p, {
                  role: "assistant",
                  content: data.reply || "",
                  reasoning: data.reasoning || "",
                  toolCalls: tcs,
                }]);
                // If AI called set_email/set_recipients, save compose data
                const emailCall = tcs.find((tc: any) => tc.name === "set_email" || tc.name === "set_subject");
                if (emailCall) {
                  try {
                    const args = typeof emailCall.args === "string" ? JSON.parse(emailCall.args) : emailCall.args;
                    const threadId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null;
                    setComposeData({
                      subject: args.subject || "",
                      body: args.body || "",
                      threadId: threadId || undefined,
                    });
                  } catch {}
                }
                break;
              case "error":
                setMessages(p => [...p, { role: "assistant", content: `Error: ${data.message}` }]);
                break;
            }
          } catch {}
        }
      }
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setStreamingReply("");
    setStreamingReasoning("");
    setStreamingToolCall(null);
    setLoading(false);
  }, [input, messages, router, close]);

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
                <>
                  {messages.map((m, i) => (
                    <Message from={m.role} key={i}>
                      <MessageContent>
                        {m.reasoning && (
                          <Reasoning>
                            <ReasoningTrigger />
                            <ReasoningContent>{m.reasoning}</ReasoningContent>
                          </Reasoning>
                        )}
                        <MessageResponse>{m.content}</MessageResponse>
                      </MessageContent>
                    </Message>
                  ))}
                  {loading && (
                    <Message from="assistant">
                      <MessageContent>
                        {streamingReasoning && (
                          <Reasoning isStreaming>
                            <ReasoningTrigger />
                            <ReasoningContent>{streamingReasoning}</ReasoningContent>
                          </Reasoning>
                        )}
                        {!streamingReasoning && !streamingToolCall && (
                          <Reasoning isStreaming>
                            <ReasoningTrigger />
                            <ReasoningContent>...</ReasoningContent>
                          </Reasoning>
                        )}
                        {streamingToolCall && (
                          <Task defaultOpen>
                            <TaskTrigger title={`Using tool: ${streamingToolCall.name}`} />
                            <TaskContent>
                              <TaskItem>{streamingToolCall.args.slice(0, 200)}</TaskItem>
                            </TaskContent>
                          </Task>
                        )}
                        {streamingReply && <MessageResponse>{streamingReply}</MessageResponse>}
                      </MessageContent>
                    </Message>
                  )}
                </>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

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
              <div />
              <PromptInputTools>
                <Select value={reasoningEffort} onValueChange={setReasoningEffort}>
                  <SelectTrigger className="size-8 p-0 flex items-center justify-center">
                    <EllipsisVertical className="size-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <PromptInputSubmit status={loading ? "streaming" : "ready"} disabled={!input.trim()} />
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
