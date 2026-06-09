'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, CreditCard, Receipt, Contact, BarChart3, LogOut, Mail, Send } from 'lucide-react';
import { Logo } from './logo';
import type { Route } from './nav-main';
import DashboardNavigation from './nav-main';

const adminRoutes: Route[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <LayoutDashboard className="size-4" />,
    link: '/admin',
  },
  {
    id: 'campaigns',
    title: 'Campaigns',
    icon: <Send className="size-4" />,
    link: '/admin/campaigns',
  },
  {
    id: 'emails',
    title: 'Emails',
    icon: <Mail className="size-4" />,
    link: '/admin/emails',
  },
  {
    id: 'users',
    title: 'Users',
    icon: <Users className="size-4" />,
    link: '/admin/users',
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: <Contact className="size-4" />,
    link: '/admin/customers',
  },
  {
    id: 'subscriptions',
    title: 'Billing',
    icon: <CreditCard className="size-4" />,
    link: '/admin/subscriptions',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: <Receipt className="size-4" />,
    link: '/admin/transactions',
  },
  {
    id: 'statistics',
    title: 'Statistics',
    icon: <BarChart3 className="size-4" />,
    link: '/admin/statistics',
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader
        className={cn(
          'flex md:pt-3.5',
          isCollapsed
            ? 'flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start'
            : 'flex-row items-center justify-between'
        )}
      >
        <a href="/admin" className="flex items-center gap-2">
          <Logo className="size-8" />
          {!isCollapsed && (
            <span className="font-semibold text-black dark:text-white">Admin</span>
          )}
        </a>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={adminRoutes} />
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-100 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/login" className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <LogOut className="size-4" />
                <span>Logout</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
