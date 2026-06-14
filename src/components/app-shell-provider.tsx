"use client";
import { useState, createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-04/app-sidebar";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { AiPanelProvider } from "@/contexts/ai-panel-context";
import { MailProvider } from "@/components/sidebar-04/mail-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

const SidebarCollapseContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: false, setCollapsed: () => {} });
export function useSidebarCollapse() { return useContext(SidebarCollapseContext); }

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const handleSetCollapsed = (v: boolean) => { setCollapsed(v); try { localStorage.setItem("sidebar_collapsed", String(v)); } catch {} };
  return (
    <AuthProvider>
      <AuthGate>
        {isLoginPage ? (
          <>{children}</>
        ) : (
          <MailProvider>
            <AiPanelProvider>
              <SidebarCollapseContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
                <SidebarProvider>
                  <div className="flex h-dvh w-full">
                    <AppSidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />
                    <SidebarInset className="flex flex-col min-h-0">
                      <div className="mx-auto w-full max-w-[1024px] px-6 pt-6 pb-12 flex-1 flex flex-col min-h-0">{children}</div>
                    </SidebarInset>
                    <AiChatPanel />
                  </div>
                </SidebarProvider>
              </SidebarCollapseContext.Provider>
            </AiPanelProvider>
          </MailProvider>
        )}
      </AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return <div className="flex h-dvh items-center justify-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-black" /></div>;
  }

  if (!user && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
