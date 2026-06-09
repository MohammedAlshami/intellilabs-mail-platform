"use client";

import { AiPanelProvider } from "@/contexts/ai-panel-context";
import { MailProvider } from "@/components/sidebar-04/mail-context";

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  return (
    <MailProvider>
      <AiPanelProvider>
        {children}
      </AiPanelProvider>
    </MailProvider>
  );
}
