"use client"
import * as React from "react"
import { Send, Paperclip, X, Minimize2, Maximize2, Sparkles, Bold, Italic, List, ListOrdered } from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Attachment { name: string; contentType: string; content: string }
interface ComposeProps { open: boolean; onOpenChange: (open: boolean) => void; onSend?: () => void; initialTo?: string; initialSubject?: string; initialText?: string; replyMode?: boolean; inline?: boolean }

export function Compose({ open, onOpenChange, onSend, initialTo, initialSubject, initialText, replyMode, inline }: ComposeProps) {
  const [to, setTo] = React.useState(initialTo || ""); const [cc, setCc] = React.useState(""); const [bcc, setBcc] = React.useState(""); const [subject, setSubject] = React.useState(initialSubject || ""); const [sending, setSending] = React.useState(false); const [attachments, setAttachments] = React.useState<Attachment[]>([]); const [expanded, setExpanded] = React.useState(false); const [showCc, setShowCc] = React.useState(false); const [showBcc, setShowBcc] = React.useState(false); const [aiPrompt, setAiPrompt] = React.useState(""); const [aiStreaming, setAiStreaming] = React.useState(false); const [showAiInput, setShowAiInput] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null); const aiTextRef = React.useRef("")

  const editor = useEditor({ extensions: [StarterKit, Placeholder.configure({ placeholder: "Write your message..." })], content: initialText || "", editorProps: { attributes: { class: "text-sm max-w-none focus:outline-none min-h-[220px] px-3 py-2 leading-relaxed" } } })

  React.useEffect(() => {
    if (initialTo) setTo(initialTo); if (initialSubject) setSubject(initialSubject);
    if (initialText && editor) editor.commands.setContent(initialText);
    else if (editor && !initialText) editor.commands.setContent("");
    if (editor && open && !replyMode) {
      fetch("/api/email-signatures").then(r => r.json()).then((sigs: any[]) => { const def = sigs.find((s: any) => s.isDefault); if (def && def.content) { const cur = editor.getText(); if (!cur.includes(def.content)) editor.commands.setContent((cur ? cur + "\n\n" : "") + "-- \n" + def.content); } }).catch(() => {})
    }
  }, [initialTo, initialSubject, initialText, editor, open, replyMode])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files) return; const na: Attachment[] = []; for (const file of files) { const b = await fileToBase64(file); na.push({ name: file.name, contentType: file.type, content: b }); } setAttachments(p => [...p, ...na]); e.target.value = ""; }
  const removeAttachment = (i: number) => setAttachments(p => p.filter((_, j) => j !== i))

  const handleSend = async () => {
    if (!to.trim()) return; setSending(true); const text = editor?.getText() || "";
    try { const res = await fetch("/api/mails/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, cc, bcc, subject, text, attachments: attachments.length > 0 ? attachments : undefined }) }); if (!res.ok) throw new Error("Failed"); resetForm(); onOpenChange(false); onSend?.(); } catch (err) { console.error(err) } finally { setSending(false) }
  }

  const resetForm = () => { setTo(""); setCc(""); setBcc(""); setSubject(""); setAttachments([]); setShowCc(false); setShowBcc(false); setAiPrompt(""); setShowAiInput(false); if (editor) editor.commands.setContent("") }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !editor) return; setAiStreaming(true); aiTextRef.current = ""; const ctx = editor.getText();
    try { const res = await fetch("/api/mails/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt, context: ctx }) }); if (!res.ok) throw new Error("AI failed"); const reader = res.body?.getReader(); if (!reader) return; const dec = new TextDecoder(); let full = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; full += dec.decode(value, { stream: true }); const html = "<p>" + full.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + "</p>"; editor.commands.setContent(html); }
      setAiPrompt(""); setShowAiInput(false);
    } catch (err) { console.error(err) } finally { setAiStreaming(false) }
  }

  const handleAcceptAi = () => { setShowAiInput(false); setAiPrompt("") }
  const handleRejectAi = () => { if (editor) editor.commands.setContent(""); setShowAiInput(false); setAiPrompt("") }

  if (!open && !expanded && !inline) return null; if (inline && (!open && !expanded)) return null

  const panelContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <span className="text-sm font-medium">{replyMode ? "Reply" : "New Message"}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-muted rounded transition-colors" title={expanded ? "Minimize" : "Expand"}>{expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
          <button onClick={() => { resetForm(); onOpenChange(false); }} className="p-1 hover:bg-muted rounded transition-colors"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <Input placeholder="To" value={to} onChange={e => setTo(e.target.value)} className="border-0 border-b rounded-none px-0 focus-visible:ring-0 text-sm" />
        {!showCc && !showBcc && <button onClick={() => setShowCc(true)} className="text-xs text-muted-foreground hover:text-foreground px-0">CC / BCC</button>}
        {showCc && <Input placeholder="CC" value={cc} onChange={e => setCc(e.target.value)} className="border-0 border-b rounded-none px-0 focus-visible:ring-0 text-sm" />}
        {showBcc && <Input placeholder="BCC" value={bcc} onChange={e => setBcc(e.target.value)} className="border-0 border-b rounded-none px-0 focus-visible:ring-0 text-sm" />}
        {showCc && !showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-muted-foreground hover:text-foreground px-0">+ BCC</button>}
        <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="border-0 border-b rounded-none px-0 focus-visible:ring-0 text-sm" />
        {editor && <div className="flex items-center gap-1 border-b pb-1">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted")}><Bold className="h-3.5 w-3.5" /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted")}><Italic className="h-3.5 w-3.5" /></button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted")}><List className="h-3.5 w-3.5" /></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted")}><ListOrdered className="h-3.5 w-3.5" /></button>
          <div className="ml-auto">{!showAiInput && <button onClick={() => setShowAiInput(true)} className="p-1 rounded hover:bg-muted text-yellow-600" title="AI Write"><Sparkles className="h-3.5 w-3.5" /></button>}</div>
        </div>}
        {showAiInput && <div className="border rounded-md p-2 bg-muted/20 space-y-2"><div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-yellow-600 shrink-0" /><Input placeholder="Describe the email you want..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="text-xs border-0 h-7 focus-visible:ring-0" onKeyDown={e => { if (e.key === "Enter") handleAiGenerate(); }} /></div><div className="flex items-center justify-end gap-1">{aiStreaming ? <span className="text-xs text-muted-foreground">Generating...</span> : aiTextRef.current ? <><Button size="sm" variant="outline" onClick={handleRejectAi} className="h-7 text-xs"><X className="h-3 w-3 mr-1" />Reject</Button><Button size="sm" onClick={handleAcceptAi} className="h-7 text-xs"><Sparkles className="h-3 w-3 mr-1" />Accept</Button></> : <Button size="sm" onClick={handleAiGenerate} disabled={!aiPrompt.trim()} className="h-7 text-xs"><Sparkles className="h-3 w-3 mr-1" />Generate</Button>}</div></div>}
        <div className="border rounded-md min-h-[220px]"><EditorContent editor={editor} /></div>
        {attachments.length > 0 && <div className="flex flex-wrap gap-1">{attachments.map((a, i) => <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">{a.name}<button onClick={() => removeAttachment(i)} className="hover:text-foreground text-muted-foreground"><X className="h-3 w-3" /></button></span>)}</div>}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></Button><input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} /></div><Button onClick={handleSend} disabled={!to.trim() || sending} size="sm" className="h-8"><Send className="mr-1.5 h-3.5 w-3.5" />{sending ? "Sending..." : "Send"}</Button></div>
    </div>
  )

  if (expanded) return <Dialog open={expanded} onOpenChange={v => { setExpanded(v); if (!v) onOpenChange(false); }}><DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl"><DialogHeader className="sr-only"><DialogTitle>New Message</DialogTitle></DialogHeader>{panelContent}</DialogContent></Dialog>
  if (inline) return <div className="border rounded-xl overflow-hidden">{panelContent}</div>
  return <div className="fixed bottom-0 right-4 z-50 w-[960px] h-[580px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">{panelContent}</div>
}

function fileToBase64(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); }) }
