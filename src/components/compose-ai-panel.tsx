"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Trash2, X, EllipsisVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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

interface ComposeAiPanelProps {
  onClose: () => void;
  currentContent: string;
  currentSubject: string;
  onUpdateContent: (html: string) => void;
  onUpdateSubject: (subject: string) => void;
  onUpdateRecipients?: (to: string[], cc?: string, bcc?: string) => void;
}

export function ComposeAiPanel({ onClose, currentContent, currentSubject, onUpdateContent, onUpdateSubject, onUpdateRecipients }: ComposeAiPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [streamingToolCall, setStreamingToolCall] = useState<{ name: string; args: string } | null>(null);
  const [reasoningEffort, setReasoningEffort] = useState("low");
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
      const contextMsg = `Current email - Subject: "${currentSubject}" | Body: "${currentContent}"`;
      const convMessages = [
        { role: "system", content: `You are a compose email assistant. ${contextMsg}

You have the set_email tool which sets the subject and body at once.
- When writing or drafting an email, ALWAYS call set_email with a subject and body.
- Use [placeholder] values if details are missing.
- Never output subject or body as text — always use the tool.` },
        ...messages,
        { role: "user", content: msg },
      ];
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convMessages, reasoningEffort }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";

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
                reply += data.content;
                setStreamingReply(reply);
                break;
              case "tool_call":
                setStreamingToolCall({ name: data.name, args: JSON.stringify(data.args) });
                if (data.name === "set_subject" && data.args?.subject) onUpdateSubject(data.args.subject);
                if (data.name === "set_body" && data.args?.body) onUpdateContent(data.args.body);
                if (data.name === "set_recipients" && onUpdateRecipients) {
                  const toArr = data.args?.to ? data.args.to.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                  onUpdateRecipients(toArr, data.args?.cc || "", data.args?.bcc || "");
                }
                break;
              case "result":
                reply = data.reply || reply;
                if (data.toolCalls?.length) {
                  for (const tc of data.toolCalls) {
                    if (tc.name === "set_subject" && tc.args?.subject) onUpdateSubject(tc.args.subject);
                    if (tc.name === "set_body" && tc.args?.body) onUpdateContent(tc.args.body);
                    if (tc.name === "set_recipients" && onUpdateRecipients) {
                      const toArr = tc.args?.to ? tc.args.to.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                      onUpdateRecipients(toArr, tc.args?.cc || "", tc.args?.bcc || "");
                    }
                  }
                }
                setMessages(p => [...p, {
                  role: "assistant",
                  content: reply || "Done!",
                  reasoning: data.reasoning || "",
                  toolCalls: data.toolCalls || [],
                }]);
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
  }, [input, messages, currentContent, currentSubject, onUpdateContent, onUpdateSubject]);

  return (
    <div className="flex shrink-0 flex-col overflow-hidden border-l border-sidebar-border bg-sidebar text-sidebar-foreground h-full w-[36rem]">
      <div className="flex h-full min-w-[36rem] flex-col">
        <div className="flex shrink-0 items-center justify-between px-3 py-2 border-b border-sidebar-border/60">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <span className="text-sm font-medium">Compose AI</span>
            {loading && <Loader2 className="size-3.5 animate-spin opacity-50" />}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="size-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" title="Clear chat">
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button onClick={onClose} className="size-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors" title="Close">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <Conversation>
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title="Compose AI"
                  description="Ask me to write, edit, or improve your email."
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
                        {(m as any).toolCalls?.map((tc: any, j: number) => (
                          <Task key={j} defaultOpen className="w-full mb-2">
                            <TaskTrigger title={`Using tool: ${tc.name}`} />
                            <TaskContent>
                              <TaskItem>{JSON.stringify(tc.args)}</TaskItem>
                            </TaskContent>
                          </Task>
                        ))}
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
              placeholder="Ask me to write or edit..."
              onChange={(e) => setInput(e.currentTarget.value)}
            />
            <PromptInputFooter>
              <div />
              <PromptInputTools>
                <Select value={reasoningEffort} onValueChange={setReasoningEffort}>
                  <SelectTrigger className="size-8 p-0 flex items-center justify-center">
                    <EllipsisVertical className="size-4" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
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
