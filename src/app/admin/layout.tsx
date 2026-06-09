'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/dashboard/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex h-dvh w-full bg-[#F7F7F7] dark:bg-black">
        <AdminSidebar />
        <SidebarInset className="flex flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-[1024px] px-6 pt-12 pb-24">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
