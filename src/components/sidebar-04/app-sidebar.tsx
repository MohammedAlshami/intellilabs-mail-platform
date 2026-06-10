"use client";

import { Paperclip, Send, Mail as MailIcon, Globe, Users, ShieldOff, LayoutDashboard, History, AlertTriangle, Sparkles, ScrollText, BarChart3, ShieldCheck, List, UserCog, Plus, PanelLeftClose, PanelLeft, SquarePen } from "lucide-react";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  IconBrandAmongUs,
  IconMailbox,
} from "@tabler/icons-react";
import { useMail } from "@/components/sidebar-04/mail-context";
import { NavUser } from "@/components/sidebar-04/nav-user";
import { useAiPanel } from "@/contexts/ai-panel-context";

const navGroups = [
  {
    label: "Overview",
    routes: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { title: "Reports", icon: BarChart3, path: "/reports" },
    ],
  },
  {
    label: "Email",
    routes: [
      { title: "Mail", icon: IconMailbox, path: "/mail" },
      { title: "Campaigns", icon: Send, path: "/campaign" },
      { title: "Email Lists", icon: List, path: "/email-list" },
      { title: "Sending History", icon: History, path: "/sending-history" },
      { title: "Bounce Monitor", icon: AlertTriangle, path: "/bounce-monitor" },
    ],
  },
  {
    label: "Data",
    routes: [
      { title: "Websites", icon: Globe, path: "/websites" },
      { title: "Leads", icon: Users, path: "/leads" },
      { title: "Email Lists", icon: List, path: "/email-list" },
      { title: "Removal List", icon: ShieldOff, path: "/removal-list" },
    ],
  },
  {
    label: "Admin",
    routes: [
      { title: "Audit Trail", icon: ScrollText, path: "/audit-trail" },
      { title: "Roles", icon: ShieldCheck, path: "/roles" },
      { title: "Users", icon: UserCog, path: "/users" },
    ],
  },
];

const user = {
  name: "ephraim",
  email: "ephraim@blocks.so",
  avatar: "/avatar-01.png",
};

export function AppSidebar({ collapsed, setCollapsed, ...props }: { collapsed: boolean; setCollapsed: (v: boolean) => void } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const { mails, loading, setSelectedMail } = useMail();
  const { toggle: toggleAi } = useAiPanel();

  const filteredMails = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mails;
    return mails.filter((m) =>
      [m.name, m.email, m.subject, m.teaser]
        .join("\n")
        .toLowerCase()
        .includes(q)
    );
  }, [mails, query]);

  return (
    <div className="flex">
      <Sidebar
        style={{ "--sidebar-width": collapsed ? "4.5rem" : "12rem" } as React.CSSProperties}
        collapsible="none"
        className={`border-r p-2 px-1 transition-[width] duration-300 ease-in-out ${collapsed ? 'w-[4.5rem]' : ''}`}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between px-1.5 py-1">
                {!collapsed && <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Menu</span>}
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
                </button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className={`px-1.5 md:px-0 text-xs flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>
                {collapsed ? null : group.label}
                {group.label === "Email" && !collapsed && (
                  <button
                    onClick={() => router.push('/campaign?compose=true')}
                    className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="New Campaign"
                  >
                    <SquarePen className="size-3.5" />
                  </button>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu>
                  {group.routes.map((route) => (
                    <SidebarMenuItem key={route.path}>
                      <SidebarMenuButton
                        onClick={() => router.push(route.path)}
                        isActive={pathname === route.path}
                        className={`px-2.5 md:px-2 ${collapsed ? 'justify-center' : ''}`}
                        title={collapsed ? route.title : undefined}
                      >
                        <route.icon />
                        {!collapsed && <span>{route.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleAi} className={`text-gray-500 hover:text-gray-700 ${collapsed ? 'justify-center' : ''}`}>
                <Sparkles className="size-4" />
                {!collapsed && <span>AI Assistant</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {!collapsed && <NavUser user={user} />}
        </SidebarFooter>
      </Sidebar>

      {pathname === "/mail" && (
      <Sidebar
        collapsible="none"
        className="hidden flex-1 border-r md:flex min-w-96"
      >
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              Inbox
            </div>
          </div>
          <SidebarInput
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0 pt-0">
            <SidebarGroupContent>
              {loading && (
                <div className="text-muted-foreground p-4 text-sm">
                  Loading emails...
                </div>
              )}
              {!loading && filteredMails.length === 0 && (
                <div className="text-muted-foreground p-4 text-sm">
                  No emails
                </div>
              )}
              {filteredMails.map((mail) => (
                <a
                  href="#"
                  key={mail.id}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedMail(mail);
                  }}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap"
                >
                  <div className="flex w-full items-center gap-2">
                    <span>{mail.name}</span>
                    {mail.hasAttachments && <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span className="ml-auto text-xs">{formatDate(mail.date)}</span>
                  </div>
                  <span className="font-medium">{mail.subject}</span>
                  <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                    {mail.teaser}
                  </span>
                </a>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      )}
    </div>
  );
}

function formatDate(date: string): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return date;
  }
}
