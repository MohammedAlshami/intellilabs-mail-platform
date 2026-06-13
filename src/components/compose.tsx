"use client"

import React, { useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, Paperclip, Send, X, Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/modal"
import { ComposeAiPanel } from "@/components/compose-ai-panel"

interface Attachment { name: string; contentType: string; content: string }
interface ComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend?: () => void
  initialTo?: string
  initialSubject?: string
  initialText?: string
  replyMode?: boolean
  inline?: boolean
  threadId?: string
  onAiAssistantClick?: () => void
}

function ToolbarButton({ onClick, active, children, label }: { onClick?: () => void; active?: boolean; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={!!active}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${active ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
    >
      {children}
    </button>
  )
}

export function Compose({ open, onOpenChange, onSend, initialTo, initialSubject, initialText, replyMode, inline, threadId, onAiAssistantClick }: ComposeProps) {
  const [recipients, setRecipients] = useState<string[]>(initialTo ? [initialTo] : [])
  const [recipientInput, setRecipientInput] = useState("")
  const [cc, setCc] = useState<string[]>([])
  const [ccInput, setCcInput] = useState("")
  const [bcc, setBcc] = useState<string[]>([])
  const [bccInput, setBccInput] = useState("")
  const [subject, setSubject] = useState(initialSubject || "")
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiStreaming, setAiStreaming] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [signatureHtml, setSignatureHtml] = useState("")
  const [showAiPanel, setShowAiPanel] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your message..." }),
    ],
    content: initialText || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[260px] text-slate-800 [&_p:empty]:block [&_p:empty]:h-[1em]",
      },
    },
  })

  React.useEffect(() => {
    if (initialSubject) setSubject(initialSubject)
    if (initialText && editor) editor.commands.setContent(initialText)
    if (open && !replyMode && !signatureHtml) {
      fetch("/api/email-signatures").then(r => r.json()).then((sigs: any[]) => {
        const def = sigs.find((s: any) => s.isDefault)
        if (def && def.content) setSignatureHtml(def.content.replace(/\n/g, "<br>"))
      }).catch(() => {})
    }
  }, [initialSubject, initialText, editor, open, replyMode, signatureHtml])

  const addRecipient = () => {
    const val = recipientInput.trim()
    if (val && !recipients.includes(val)) setRecipients([...recipients, val])
    setRecipientInput("")
  }

  const removeRecipient = (email: string) => setRecipients(recipients.filter(r => r !== email))

  const handleRecipientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addRecipient() }
    else if (e.key === "Backspace" && recipientInput === "" && recipients.length > 0) setRecipients(recipients.slice(0, -1))
  }

  const addCc = () => {
    const val = ccInput.trim()
    if (val && !cc.includes(val)) setCc([...cc, val])
    setCcInput("")
  }
  const removeCc = (email: string) => setCc(cc.filter(r => r !== email))
  const handleCcKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addCc() }
    else if (e.key === "Backspace" && ccInput === "" && cc.length > 0) setCc(cc.slice(0, -1))
  }

  const addBcc = () => {
    const val = bccInput.trim()
    if (val && !bcc.includes(val)) setBcc([...bcc, val])
    setBccInput("")
  }
  const removeBcc = (email: string) => setBcc(bcc.filter(r => r !== email))
  const handleBccKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addBcc() }
    else if (e.key === "Backspace" && bccInput === "" && bcc.length > 0) setBcc(bcc.slice(0, -1))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const na: Attachment[] = []
    for (const file of files) {
      const b = await fileToBase64(file)
      na.push({ name: file.name, contentType: file.type, content: b })
    }
    setAttachments(p => [...p, ...na])
    e.target.value = ""
  }

  const removeAttachment = (i: number) => setAttachments(p => p.filter((_, j) => j !== i))

  const handleSend = async () => {
    if (recipients.length === 0) return
    setSending(true)
    const text = editor?.getText() || ""
    try {
      const body: any = { to: recipients.join(", "), cc: cc.join(", "), bcc: bcc.join(", "), subject, text, attachments: attachments.length > 0 ? attachments : undefined };
      if (threadId) body.threadId = threadId;
      const res = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed")
      setRecipients([])
      setSubject("")
      setAttachments([])
      if (editor) editor.commands.setContent("")
      onOpenChange(false)
      onSend?.()
    } catch (err) { console.error(err) }
    finally { setSending(false) }
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !editor) return
    setAiStreaming(true)
    try {
      const ctx = editor.getText()
      const res = await fetch("/api/mails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, context: ctx }),
      })
      if (!res.ok) throw new Error("AI failed")
      const reader = res.body?.getReader()
      if (!reader) return
      const dec = new TextDecoder()
      let full = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += dec.decode(value, { stream: true })
        const html = "<p>" + full.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + "</p>"
        editor.commands.setContent(html)
      }
      setAiPrompt("")
    } catch (err) { console.error(err) }
    finally { setAiStreaming(false) }
  }

  if (!editor) return null

  const formContent = (
    <div className="flex min-h-0 flex-1 flex-col">

      <div className="border-b border-slate-100 px-3 py-2">
        <div className="flex items-start gap-2">
          <span className="mt-1 text-xs text-slate-400">To:</span>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {recipients.map(email => (
              <span key={email} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                {email}
                <button type="button" onClick={() => removeRecipient(email)} className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={recipientInput}
              onChange={e => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={addRecipient}
              placeholder="Add recipient..."
              className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setShowCc(!showCc)} className={`text-xs px-2 py-0.5 rounded transition-colors ${showCc ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>CC</button>
            <button type="button" onClick={() => setShowBcc(!showBcc)} className={`text-xs px-2 py-0.5 rounded transition-colors ${showBcc ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>BCC</button>
          </div>
        </div>
        {showCc && (
          <div className="flex items-start gap-3 mt-2">
            <span className="mt-1.5 text-sm text-slate-400 w-[28px]">CC:</span>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {cc.map(email => (
                <span key={email} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                  {email}
                  <button type="button" onClick={() => removeCc(email)} className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input type="text" value={ccInput} onChange={e => setCcInput(e.target.value)} onKeyDown={handleCcKeyDown} onBlur={addCc} placeholder="Add CC..." className="min-w-[100px] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
            </div>
          </div>
        )}
        {showBcc && (
          <div className="flex items-start gap-3 mt-2">
            <span className="mt-1.5 text-sm text-slate-400 w-[28px]">BCC:</span>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {bcc.map(email => (
                <span key={email} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                  {email}
                  <button type="button" onClick={() => removeBcc(email)} className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input type="text" value={bccInput} onChange={e => setBccInput(e.target.value)} onKeyDown={handleBccKeyDown} onBlur={addBcc} placeholder="Add BCC..." className="min-w-[100px] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="text-xs text-slate-400">Subject:</span>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject"
          className="flex-1 bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
        />
      </div>

      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
      {signatureHtml && (
        <div className="border-t border-slate-200 pt-1 mx-3 pb-1 text-xs text-slate-800 select-none" dangerouslySetInnerHTML={{ __html: "--<br>" + signatureHtml }} />
      )}

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton label="Link" active={editor.isActive("link")} onClick={() => { const url = window.prompt("Enter URL"); if (url) editor.chain().focus().setLink({ href: url }).run() }}><LinkIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Attach file" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></ToolbarButton>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton label="AI Write" onClick={() => inline && onAiAssistantClick ? onAiAssistantClick() : setShowAiPanel(p => !p)}><Sparkles className="h-4 w-4" /></ToolbarButton>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={recipients.length === 0 || sending}
          className="inline-flex items-center justify-center rounded-lg bg-black px-2.5 py-1.5 text-white transition-colors hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1 px-5 pb-2">
          {attachments.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {a.name}
              <button onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {showAiInput && (
        <div className="mx-5 mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <input
              placeholder="Describe the email you want..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAiGenerate() }}
              className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-1">
            {aiStreaming ? (
              <span className="text-xs text-slate-500">Generating...</span>
            ) : (
              <Button size="sm" onClick={handleAiGenerate} disabled={!aiPrompt.trim()} className="h-7 text-xs"><Sparkles className="h-3 w-3 mr-1" />Generate</Button>
            )}
          </div>
        </div>
      )}

    </div>
  )

  if (inline) return <div className="border-t overflow-hidden">{formContent}</div>

  if (showAiPanel) {
    return (
      <div className="fixed inset-0 z-[100] flex" style={{ backgroundColor: "#FAFAFA" }}>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-end px-5 py-4">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl py-6">
              {formContent}
            </div>
          </div>
        </div>
        <ComposeAiPanel
          onClose={() => setShowAiPanel(false)}
          currentContent={editor?.getHTML() || ""}
          currentSubject={subject}
          onUpdateContent={(html) => editor?.commands.setContent(html)}
          onUpdateSubject={(s) => setSubject(s)}
          onUpdateRecipients={(to, ccVal, bccVal) => { setRecipients(to); setCc(ccVal ? ccVal.split(",").map(s => s.trim()).filter(Boolean) : []); setBcc(bccVal ? bccVal.split(",").map(s => s.trim()).filter(Boolean) : []); }}
        />
      </div>
    )
  }

  return (
    <Modal open={open} onClose={() => onOpenChange(false)}>
      {formContent}
    </Modal>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
