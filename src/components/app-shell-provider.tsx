"use client";

import { useState, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-04/app-sidebar";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { AiPanelProvider } from "@/contexts/ai-panel-context";
import { MailProvider } from "@/components/sidebar-04/mail-context";

const SidebarCollapseContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  const handleSetCollapsed = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem("sidebar_collapsed", String(v)); } catch {}
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <MailProvider>
      <AiPanelProvider>
        <SidebarCollapseContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
          <SidebarProvider>
            <div className="flex h-dvh w-full">
              <AppSidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />
              <SidebarInset className="flex flex-col overflow-y-auto">
                <div className="mx-auto w-full max-w-[1024px] px-6 pt-12 pb-24">
                  {children}
                </div>
              </SidebarInset>
              <AiChatPanel />
            </div>
          </SidebarProvider>
        </SidebarCollapseContext.Provider>
      </AiPanelProvider>
    </MailProvider>
  );
}
