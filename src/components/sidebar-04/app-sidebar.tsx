"use client";
import { Paperclip, Send, Mail as MailIcon, Globe, Users, ShieldOff, LayoutDashboard, History, AlertTriangle, Sparkles, ScrollText, BarChart3, ShieldCheck, List, UserCog, PanelLeftClose, PanelLeft, SquarePen, MoreVertical, Archive, Trash2, Check, X as XIcon, FileText, PenLine, Menu } from "lucide-react";
import * as React from "react"; import { usePathname, useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button"; import { cn } from "@/lib/utils";
import { IconBrandAmongUs, IconMailbox } from "@tabler/icons-react";
import { useMail, type FolderTab, type Mail } from "@/components/sidebar-04/mail-context";
import { NavUser } from "@/components/sidebar-04/nav-user"; import { useAiPanel } from "@/contexts/ai-panel-context"; import { Compose } from "@/components/compose";

const navGroups = [
  { label: "Overview", routes: [{ title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }, { title: "Reports", icon: BarChart3, path: "/reports" }] },
  { label: "Email", routes: [{ title: "Mail", icon: IconMailbox, path: "/mail" }, { title: "Campaigns", icon: Send, path: "/campaign" }, { title: "Email Lists", icon: List, path: "/email-list" }, { title: "Sending History", icon: History, path: "/sending-history" }, { title: "Bounce Monitor", icon: AlertTriangle, path: "/bounce-monitor" }, { title: "Templates", icon: FileText, path: "/email-templates" }, { title: "Signatures", icon: PenLine, path: "/email-signatures" }] },
  { label: "Data", routes: [{ title: "Websites", icon: Globe, path: "/websites" }, { title: "Leads", icon: Users, path: "/leads" }, { title: "Email Lists", icon: List, path: "/email-list" }, { title: "Removal List", icon: ShieldOff, path: "/removal-list" }] },
  { label: "Admin", routes: [{ title: "Audit Trail", icon: ScrollText, path: "/audit-trail" }, { title: "Roles", icon: ShieldCheck, path: "/roles" }, { title: "Users", icon: UserCog, path: "/users" }] },
];

const defaultUser = { name: "User", email: "", avatar: "" };
const FOLDER_LABELS: Record<FolderTab, string> = { inbox: "Inbox", sent: "Sent", drafts: "Drafts", trash: "Trash", archive: "Archive" };

async function performAction(mailId: string, action: string) { try { await fetch(`/api/mails/${mailId}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); } catch {} }

function SidebarContent_({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const pathname = usePathname(); const router = useRouter();
  const { toggle: toggleAi } = useAiPanel();
  const [user, setUser] = React.useState(defaultUser);
  React.useEffect(() => { fetch("/api/profile").then(r => r.json()).then(d => { if (d.name || d.email) setUser({ name: d.name || d.email, email: d.email, avatar: "" }); }).catch(() => {}); }, []);
  return (
    <>
      <SidebarHeader><SidebarMenu><SidebarMenuItem><div className="flex items-center justify-between px-1.5 py-1">{!collapsed && <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Menu</span>}<button onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}</button></div></SidebarMenuItem></SidebarMenu></SidebarHeader>
      <SidebarContent>
        {navGroups.map(g => (
          <SidebarGroup key={g.label}><SidebarGroupLabel className={`px-1.5 md:px-0 text-xs flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>{collapsed ? null : g.label}</SidebarGroupLabel>
            <SidebarGroupContent className="px-1.5 md:px-0"><SidebarMenu>{g.routes.map(r => (<SidebarMenuItem key={r.path}><SidebarMenuButton onClick={() => router.push(r.path)} isActive={pathname === r.path} className={`px-2.5 md:px-2 ${collapsed ? 'justify-center' : ''}`} title={collapsed ? r.title : undefined}><r.icon />{!collapsed && <span>{r.title}</span>}</SidebarMenuButton></SidebarMenuItem>))}</SidebarMenu></SidebarGroupContent></SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={toggleAi} className={`text-gray-500 hover:text-gray-700 ${collapsed ? 'justify-center' : ''}`}><Sparkles className="size-4" />{!collapsed && <span>AI Assistant</span>}</SidebarMenuButton></SidebarMenuItem></SidebarMenu>{!collapsed && <NavUser user={{ name: user.name, email: user.email, avatar: user.avatar }} />}</SidebarFooter>
    </>
  );
}

export function AppSidebar({ collapsed, setCollapsed, ...props }: { collapsed: boolean; setCollapsed: (v: boolean) => void } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname(); const router = useRouter(); const [query, setQuery] = React.useState("");
  const { mails, loading, setSelectedMail, folder, setFolder } = useMail(); const { toggle: toggleAi } = useAiPanel(); const [composeOpen, setComposeOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const filteredMails = React.useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return mails; return mails.filter(m => [m.name, m.email, m.subject, m.teaser].join("\n").toLowerCase().includes(q)); }, [mails, query]);
  return (
    <div className="flex">
      {/* Mobile hamburger button */}
      <button onClick={() => setMobileOpen(true)} className="fixed top-2 left-2 z-50 p-2 rounded-md bg-background border shadow-sm md:hidden">
        <Menu className="size-5" />
      </button>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[18rem]">
          <Sidebar collapsible="icon" className="border-0 w-full">
            <SidebarContent_ collapsed={false} setCollapsed={() => {}} />
          </Sidebar>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar collapsible="none" className="border-r p-2 px-1 transition-[width] duration-300 ease-in-out">
          <SidebarContent_ collapsed={collapsed} setCollapsed={setCollapsed} />
        </Sidebar>
      </div>

      {pathname === "/mail" && (
        <div className="hidden md:flex flex-1">
          <Sidebar collapsible="none" className="flex-1 border-r min-w-[24rem] w-[24rem]">
          <Compose open={composeOpen} onOpenChange={setComposeOpen} />
          <SidebarHeader className="gap-2 border-b p-4">
            <div className="flex w-full items-center justify-between"><div className="text-foreground text-base font-medium">{FOLDER_LABELS[folder]}</div><button onClick={() => setComposeOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"><SquarePen className="h-3.5 w-3.5" />New</button></div>
            <SidebarInput placeholder="Type to search..." value={query} onChange={e => setQuery(e.target.value)} />
            <div className="flex gap-1 -mx-1">{(Object.keys(FOLDER_LABELS) as FolderTab[]).map(tab => (<button key={tab} onClick={() => setFolder(tab)} className={cn("px-2.5 py-1 text-xs rounded-md font-medium transition-colors", folder === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{FOLDER_LABELS[tab]}</button>))}</div>
          </SidebarHeader>
          <SidebarContent><SidebarGroup className="px-0 pt-0"><SidebarGroupContent>
            {loading && <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="space-y-2 animate-pulse"><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /></div>)}</div>}
            {!loading && filteredMails.length === 0 && <div className="text-muted-foreground p-4 text-sm">No emails</div>}
            {filteredMails.map(mail => <MailListItem key={mail.id} mail={mail} onSelect={() => { setSelectedMail(mail); window.history.replaceState(null, "", `/mail?id=${encodeURIComponent(mail.id)}`); }} />)}
          </SidebarGroupContent></SidebarGroup></SidebarContent>
        </Sidebar>
        </div>
      )}
    </div>
  );
}

function MailListItem({ mail, onSelect }: { mail: Mail; onSelect: () => void }) {
  return (
    <div className="group relative border-b">
      <a href="#" onClick={(e) => { e.preventDefault(); onSelect(); }} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 p-4 text-sm leading-tight whitespace-nowrap">
        <div className="flex w-full items-center gap-2">
          <span className="truncate">{mail.name}</span>
          {mail.hasAttachments && <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => performAction(mail.id, "archive")}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
                <DropdownMenuItem onClick={() => performAction(mail.id, "trash")}><Trash2 className="mr-2 h-4 w-4" />Trash</DropdownMenuItem>
                <DropdownMenuItem onClick={() => performAction(mail.id, "read")}><Check className="mr-2 h-4 w-4" />Mark read</DropdownMenuItem>
                <DropdownMenuItem onClick={() => performAction(mail.id, "unread")}><XIcon className="mr-2 h-4 w-4" />Mark unread</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>
        <span className="font-medium">{mail.subject}</span>
        <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">{mail.teaser}</span>
        <span className="text-xs text-muted-foreground">{formatDate(mail.date)}</span>
      </a>
    </div>
  );
}

function formatDate(date: string): string { try { const d = new Date(date); const now = new Date(); const dd = Math.floor((now.getTime() - d.getTime()) / (1000*60*60*24)); if (dd === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); if (dd === 1) return "Yesterday"; if (dd < 7) return d.toLocaleDateString([], { weekday: "short" }); return d.toLocaleDateString([], { month: "short", day: "numeric" }); } catch { return date; } }
