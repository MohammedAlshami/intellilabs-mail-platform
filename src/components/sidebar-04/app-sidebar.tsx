"use client";

import { Archive, Flag, Paperclip, Send, Mail as MailIcon, LayoutDashboard } from "lucide-react";
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
  IconCarambola,
  IconHourglassHigh,
  IconMailbox,
} from "@tabler/icons-react";
import { useMail } from "@/components/sidebar-04/mail-context";
import { NavUser } from "@/components/sidebar-04/nav-user";

const pageRoutes = [
  { title: "Mail", icon: IconMailbox, path: "/" },
  { title: "Campaigns", icon: Send, path: "/campaign" },
  { title: "Email List", icon: MailIcon, path: "/email-list" },
];

const navMain = [
  { title: "Inbox", icon: IconMailbox, isActive: true },
  { title: "Starred", icon: IconCarambola, isActive: false },
  { title: "Important", icon: Flag, isActive: false },
  { title: "Scheduled", icon: IconHourglassHigh, isActive: false },
  { title: "Archive", icon: Archive, isActive: false },
];

const labels = [
  { title: "Personal", color: "bg-green-400 dark:bg-green-300" },
  { title: "Work", color: "bg-blue-400 dark:bg-blue-300" },
  { title: "Travel", color: "bg-orange-400 dark:bg-orange-300" },
  { title: "Receipts", color: "bg-purple-400 dark:bg-purple-300" },
];

const user = {
  name: "ephraim",
  email: "ephraim@blocks.so",
  avatar: "/avatar-01.png",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeItem, setActiveItem] = React.useState(navMain[0]);
  const [query, setQuery] = React.useState("");
  const { mails, loading, setSelectedMail } = useMail();

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
        style={{ "--sidebar-width": "12rem" } as React.CSSProperties}
        collapsible="none"
        className="border-r p-2 px-1"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="/">
                  <div className="bg-sidebar-accent text-sidebar-accent-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <IconBrandAmongUs className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-1.5 md:px-0 text-xs">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {pageRoutes.map((route) => (
                  <SidebarMenuItem key={route.path}>
                    <SidebarMenuButton
                      onClick={() => router.push(route.path)}
                      isActive={pathname === route.path}
                      className="px-2.5 md:px-2"
                    >
                      <route.icon />
                      <span>{route.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => setActiveItem(item)}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel className="px-1.5 md:px-0 text-xs">
              Labels
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {labels.map((label) => (
                  <SidebarMenuItem key={label.title}>
                    <SidebarMenuButton asChild className="px-2.5 md:px-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded ${label.color}`}></div>
                        <span>{label.title}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      <Sidebar
        collapsible="none"
        className="hidden flex-1 border-r md:flex min-w-96"
      >
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
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
