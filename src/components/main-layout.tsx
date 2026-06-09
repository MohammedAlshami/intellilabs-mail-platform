"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-04/app-sidebar";
import { MailProvider } from "@/components/sidebar-04/mail-context";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MailProvider>
      <SidebarProvider>
        <div className="flex h-dvh w-full">
          <AppSidebar />
          <SidebarInset>
            <div className="flex-1 rounded-xl border m-2">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MailProvider>
  );
}
