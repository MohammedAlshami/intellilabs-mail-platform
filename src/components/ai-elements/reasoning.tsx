"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

const ReasoningContext = createContext<{ isStreaming: boolean }>({ isStreaming: false });

export function useReasoning() {
  return useContext(ReasoningContext);
}

export function Reasoning({ children, className, isStreaming, defaultOpen = true }: { children: ReactNode; className?: string; isStreaming?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <ReasoningContext.Provider value={{ isStreaming: !!isStreaming }}>
      <Collapsible open={open || !!isStreaming} onOpenChange={setOpen} className={cn("rounded-lg border bg-sidebar-accent/30", className)}>
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
}

export function ReasoningTrigger({ getThinkingMessage, children, ...props }: { getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode; children?: ReactNode; [key: string]: any }) {
  const { isStreaming } = useReasoning();
  return (
    <CollapsibleTrigger asChild>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
        <BrainIcon className="size-3.5" />
        {getThinkingMessage ? getThinkingMessage(isStreaming, undefined) : isStreaming ? "Thinking..." : "Thought process"}
        <ChevronDownIcon className="size-3 ml-auto transition-transform ui-open:rotate-180" />
      </button>
    </CollapsibleTrigger>
  );
}

export function ReasoningContent({ children, className, ...props }: { children: ReactNode; className?: string; [key: string]: any }) {
  return (
    <CollapsibleContent className={cn("px-3 pb-2 text-xs leading-relaxed text-sidebar-foreground/60 border-t border-sidebar-border/40 pt-2", className)}>
      {children}
    </CollapsibleContent>
  );
}
