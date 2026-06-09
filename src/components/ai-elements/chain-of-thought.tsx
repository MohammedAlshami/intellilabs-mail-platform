"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LightbulbIcon, ChevronDownIcon, Dot } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ChainOfThought({ children, className, defaultOpen = false }: { children: ReactNode; className?: string; defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={cn("rounded-lg border bg-sidebar-accent/30", className)}>
      {children}
    </Collapsible>
  );
}

export function ChainOfThoughtHeader({ children }: { children?: ReactNode }) {
  return (
    <CollapsibleTrigger asChild>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
        <LightbulbIcon className="size-3.5" />
        {children || "Steps"}
        <ChevronDownIcon className="size-3 ml-auto transition-transform ui-open:rotate-180" />
      </button>
    </CollapsibleTrigger>
  );
}

export function ChainOfThoughtContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <CollapsibleContent className={cn("px-3 pb-2", className)}>
      {children}
    </CollapsibleContent>
  );
}

export function ChainOfThoughtStep({ label, description, icon: Icon, status = "complete" }: { label: string; description?: string; icon?: LucideIcon; status?: "complete" | "active" | "pending" }) {
  const StatusIcon = Icon || Dot;
  return (
    <div className={cn("flex items-start gap-2 py-1 text-xs", status === "pending" && "opacity-40")}>
      <StatusIcon className={cn("size-4 mt-0.5 shrink-0", status === "active" ? "text-blue-500 animate-pulse" : status === "complete" ? "text-green-500" : "text-sidebar-foreground/30")} />
      <div>
        <div className="font-medium text-sidebar-foreground">{label}</div>
        {description && <div className="text-sidebar-foreground/60 mt-0.5">{description}</div>}
      </div>
    </div>
  );
}
