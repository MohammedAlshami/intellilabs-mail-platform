"use client"

import * as React from "react"
import { Send, Paperclip, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Attachment {
  name: string
  contentType: string
  content: string
}

interface ComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend?: () => void
}

export function Compose({ open, onOpenChange, onSend }: ComposeProps) {
  const [to, setTo] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: Attachment[] = []
    for (const file of files) {
      const base64 = await fileToBase64(file)
      newAttachments.push({
        name: file.name,
        contentType: file.type,
        content: base64,
      })
    }
    setAttachments((prev) => [...prev, ...newAttachments])
    e.target.value = ""
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!to.trim()) return

    setSending(true)
    try {
      const res = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          text,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to send")
      setTo("")
      setSubject("")
      setText("")
      setAttachments([])
      onOpenChange(false)
      onSend?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send an email from your AgentMail inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message..."
              className="min-h-[200px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                  >
                    {a.name}
                    <button
                      onClick={() => removeAttachment(i)}
                      className="hover:text-foreground text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSend} disabled={!to.trim() || sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
