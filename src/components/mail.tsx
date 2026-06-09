"use client"

import * as React from "react"
import {
  AlertCircle,
  Archive,
  ArchiveX,
  File,
  Inbox,
  MessagesSquare,
  Pen,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Users2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccountSwitcher } from "@/components/account-switcher"
import { MailDisplay } from "@/components/mail-display"
import { MailList } from "@/components/mail-list"
import { Nav } from "@/components/nav"
import { Compose } from "@/components/compose"
import { type Mail } from "../app/data"
import { useMail, type Folder } from "../app/use-mail"

interface MailProps {
  accounts: {
    label: string
    email: string
    icon: React.ReactNode
  }[]
  mails: Mail[]
  defaultLayout: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
  onSend?: () => void
}

const folderTitle: Record<Folder, string> = {
  inbox: "Inbox",
  drafts: "Drafts",
  sent: "Sent",
  junk: "Junk",
  trash: "Trash",
  archive: "Archive",
  social: "Social",
  updates: "Updates",
  forums: "Forums",
  shopping: "Shopping",
  promotions: "Promotions",
}

export function Mail({
  accounts,
  mails,
  defaultLayout = [265, 440, 655],
  defaultCollapsed = false,
  navCollapsedSize,
  onSend,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [mail, setMail] = useMail()
  const [isMobile, setIsMobile] = React.useState(false)
  const [composeOpen, setComposeOpen] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const handleNavSelect = (title: string) => {
    const folder = title.toLowerCase() as Folder
    setMail({ ...mail, folder, selected: null })
  }

  const filterByFolder = React.useCallback((folder: Folder) => {
    return mails.filter((item) => {
      const labels = item.labels.map((l) => l.toLowerCase())
      switch (folder) {
        case "inbox":
          return true
        case "drafts":
          return labels.includes("draft")
        case "sent":
          return labels.includes("sent")
        case "junk":
          return labels.includes("spam") || labels.includes("junk")
        case "trash":
          return labels.includes("trash")
        case "archive":
          return labels.includes("archive")
        case "social":
          return labels.includes("social")
        case "updates":
          return labels.includes("updates")
        case "forums":
          return labels.includes("forums")
        case "shopping":
          return labels.includes("shopping")
        case "promotions":
          return labels.includes("promotions")
        default:
          return true
      }
    })
  }, [mails])

  const folderCounts = React.useMemo(() => {
    const folders: Folder[] = ["inbox", "drafts", "sent", "junk", "trash", "archive", "social", "updates", "forums", "shopping", "promotions"]
    const counts: Record<string, number> = {}
    for (const f of folders) {
      counts[f] = filterByFolder(f).length
    }
    return counts
  }, [filterByFolder])

  const filteredMails = React.useMemo(() => {
    return filterByFolder(mail.folder)
  }, [mail.folder, filterByFolder])

  const currentTitle = folderTitle[mail.folder]

  if (isMobile) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex h-full flex-col">
          {!mail.selected ? (
            <>
              <div className="flex items-center px-4 py-2">
                <h1 className="text-xl font-bold">{currentTitle}</h1>
              </div>
              <Separator />
              <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <form>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search" className="pl-8" />
                  </div>
                </form>
              </div>
              <div className="flex-1 min-h-0">
                <MailList items={filteredMails} />
              </div>
            </>
          ) : (
            <MailDisplay
              mail={mails.find((item) => item.id === mail.selected) || null}
            />
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Compose open={composeOpen} onOpenChange={setComposeOpen} onSend={onSend} />
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes
          )}`
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onCollapse={() => {
            setIsCollapsed(true)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true
            )}`
          }}
          onExpand={() => {
            setIsCollapsed(false)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false
            )}`
          }}
          className={cn(
            isCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out"
          )}
        >
          <div
            className={cn(
              "flex h-[52px] items-center justify-center",
              isCollapsed ? "h-[52px]" : "px-2"
            )}
          >
            <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} />
          </div>
          <Separator />
          <div className={cn("px-2 py-2", isCollapsed && "flex justify-center")}>
            <button
              onClick={() => setComposeOpen(true)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors",
                isCollapsed ? "h-9 w-9" : "h-9 w-full px-4"
              )}
            >
              <Pen className="h-4 w-4" />
              {!isCollapsed && <span>Compose</span>}
            </button>
          </div>
          <Nav
            isCollapsed={isCollapsed}
            onSelect={handleNavSelect}
            links={[
              {
                title: "Inbox",
                label: folderCounts.inbox ? String(folderCounts.inbox) : undefined,
                icon: Inbox,
                variant: mail.folder === "inbox" ? "default" : "ghost",
              },
              {
                title: "Drafts",
                label: folderCounts.drafts ? String(folderCounts.drafts) : undefined,
                icon: File,
                variant: mail.folder === "drafts" ? "default" : "ghost",
              },
              {
                title: "Sent",
                label: folderCounts.sent ? String(folderCounts.sent) : undefined,
                icon: Send,
                variant: mail.folder === "sent" ? "default" : "ghost",
              },
              {
                title: "Junk",
                label: folderCounts.junk ? String(folderCounts.junk) : undefined,
                icon: ArchiveX,
                variant: mail.folder === "junk" ? "default" : "ghost",
              },
              {
                title: "Trash",
                label: folderCounts.trash ? String(folderCounts.trash) : undefined,
                icon: Trash2,
                variant: mail.folder === "trash" ? "default" : "ghost",
              },
              {
                title: "Archive",
                label: folderCounts.archive ? String(folderCounts.archive) : undefined,
                icon: Archive,
                variant: mail.folder === "archive" ? "default" : "ghost",
              },
            ]}
          />
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            onSelect={handleNavSelect}
            links={[
              {
                title: "Social",
                label: folderCounts.social ? String(folderCounts.social) : undefined,
                icon: Users2,
                variant: mail.folder === "social" ? "default" : "ghost",
              },
              {
                title: "Updates",
                label: folderCounts.updates ? String(folderCounts.updates) : undefined,
                icon: AlertCircle,
                variant: mail.folder === "updates" ? "default" : "ghost",
              },
              {
                title: "Forums",
                label: folderCounts.forums ? String(folderCounts.forums) : undefined,
                icon: MessagesSquare,
                variant: mail.folder === "forums" ? "default" : "ghost",
              },
              {
                title: "Shopping",
                label: folderCounts.shopping ? String(folderCounts.shopping) : undefined,
                icon: ShoppingCart,
                variant: mail.folder === "shopping" ? "default" : "ghost",
              },
              {
                title: "Promotions",
                label: folderCounts.promotions ? String(folderCounts.promotions) : undefined,
                icon: Archive,
                variant: mail.folder === "promotions" ? "default" : "ghost",
              },
            ]}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <Tabs defaultValue="all">
            <div className="flex items-center px-4 py-2">
              <h1 className="text-xl font-bold">{currentTitle}</h1>
              <TabsList className="ml-auto">
                <TabsTrigger
                  value="all"
                  className="text-zinc-600 dark:text-zinc-200"
                >
                  All mail
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="text-zinc-600 dark:text-zinc-200"
                >
                  Unread
                </TabsTrigger>
              </TabsList>
            </div>
            <Separator />
            <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <form>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search" className="pl-8" />
                </div>
              </form>
            </div>
            <TabsContent value="all" className="m-0">
              <MailList items={filteredMails} />
            </TabsContent>
            <TabsContent value="unread" className="m-0">
              <MailList items={filteredMails.filter((item) => !item.read)} />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]}>
          <MailDisplay
            mail={mails.find((item) => item.id === mail.selected) || null}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
