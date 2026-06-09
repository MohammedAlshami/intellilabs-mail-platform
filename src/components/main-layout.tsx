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
          <SidebarInset className="flex flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-[1024px] px-6 pt-12 pb-24">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MailProvider>
  );
}
