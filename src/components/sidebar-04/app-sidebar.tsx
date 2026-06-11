"use client";

import { Paperclip, Send, Mail as MailIcon, Globe, Users, ShieldOff, LayoutDashboard, History, AlertTriangle, Sparkles, ScrollText, BarChart3, ShieldCheck, List, UserCog, Plus, PanelLeftClose, PanelLeft, SquarePen, MoreVertical, Archive, Trash2, Check, X as XIcon } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  IconBrandAmongUs,
  IconMailbox,
} from "@tabler/icons-react";
import { useMail, type FolderTab, type Mail } from "@/components/sidebar-04/mail-context";
import { NavUser } from "@/components/sidebar-04/nav-user";
import { useAiPanel } from "@/contexts/ai-panel-context";
import { Compose } from "@/components/compose";

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

const FOLDER_LABELS: Record<FolderTab, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  trash: "Trash",
  archive: "Archive",
};

const FOLDER_PATH: Record<FolderTab, string> = {
  inbox: "INBOX",
  sent: "\\Sent",
  drafts: "\\Drafts",
  trash: "\\Trash",
  archive: "\\Archive",
};

async function performAction(mailId: string, action: string) {
  try {
    await fetch(`/api/mails/${mailId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {}
}

export function AppSidebar({ collapsed, setCollapsed, ...props }: { collapsed: boolean; setCollapsed: (v: boolean) => void } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const { mails, loading, setSelectedMail, folder, setFolder } = useMail();
  const { toggle: toggleAi } = useAiPanel();
  const [composeOpen, setComposeOpen] = React.useState(false);

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
        <Compose open={composeOpen} onOpenChange={setComposeOpen} />
        <SidebarHeader className="gap-2 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {FOLDER_LABELS[folder]}
            </div>
            <button
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <SquarePen className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          <SidebarInput
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-1 -mx-1">
            {(Object.keys(FOLDER_LABELS) as FolderTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFolder(tab)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                  folder === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {FOLDER_LABELS[tab]}
              </button>
            ))}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0 pt-0">
            <SidebarGroupContent>
              {loading && (
                <div className="p-4 space-y-3">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="space-y-2 animate-pulse">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                      <div className="h-3 w-full rounded bg-muted" />
                    </div>
                  ))}
                </div>
              )}
              {!loading && filteredMails.length === 0 && (
                <div className="text-muted-foreground p-4 text-sm">
                  No emails
                </div>
              )}
              {filteredMails.map((mail) => (
                <MailListItem
                  key={mail.id}
                  mail={mail}
                  onSelect={() => setSelectedMail(mail)}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      )}
    </div>
  );
}

function MailListItem({ mail, onSelect }: { mail: Mail; onSelect: () => void }) {
  return (
    <div className="group relative">
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); onSelect(); }}
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
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => performAction(mail.id, "archive")}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => performAction(mail.id, "trash")}>
              <Trash2 className="mr-2 h-4 w-4" /> Trash
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => performAction(mail.id, "read")}>
              <Check className="mr-2 h-4 w-4" /> Mark read
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => performAction(mail.id, "unread")}>
              <XIcon className="mr-2 h-4 w-4" /> Mark unread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
