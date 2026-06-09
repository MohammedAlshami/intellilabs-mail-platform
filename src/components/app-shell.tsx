"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-04/app-sidebar";
import { MailProvider } from "@/components/sidebar-04/mail-context";
import { AiPanelProvider } from "@/contexts/ai-panel-context";
import { AiChatPanel } from "@/components/ai-chat-panel";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MailProvider>
      <AiPanelProvider>
        <SidebarProvider>
          <div className="flex h-dvh w-full">
            <AppSidebar />
            <SidebarInset className="flex flex-col overflow-y-auto">
              <div className="mx-auto w-full max-w-[1024px] px-6 pt-12 pb-24">
                {children}
              </div>
            </SidebarInset>
            <AiChatPanel />
          </div>
        </SidebarProvider>
      </AiPanelProvider>
    </MailProvider>
  );
}
