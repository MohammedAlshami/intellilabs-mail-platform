"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Bold, Italic, List, ListOrdered, Sparkles } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react"; import StarterKit from "@tiptap/starter-kit"; import Placeholder from "@tiptap/extension-placeholder";
import MainLayout from "@/components/main-layout"; import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils"; import { RowActions } from "@/components/row-actions";
type Template = { id: string; name: string; subject: string; body: string; createdAt: string }; const PAGE_SIZE = 10;

export default function Page() {
  const [templates, setTemplates] = useState<Template[]>([]); const [showAdd, setShowAdd] = useState(false); const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState(""); const [subject, setSubject] = useState(""); const [page, setPage] = useState(0);
  const [aiPrompt, setAiPrompt] = useState(""); const [showAiInput, setShowAiInput] = useState(false); const [aiStreaming, setAiStreaming] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); const [viewTemplate, setViewTemplate] = useState<Template | null>(null);

  const editor = useEditor({ extensions: [StarterKit, Placeholder.configure({ placeholder: "Write your email template..." })], content: "", editorProps: { attributes: { class: "text-sm max-w-none focus:outline-none min-h-[250px] px-3 py-2 leading-relaxed" } } });
  const fetchTemplates = () => { fetch("/api/email-templates").then(r => r.json()).then(setTemplates); }; useEffect(() => { fetchTemplates(); }, []);
  const totalPages = Math.ceil(templates.length / PAGE_SIZE); const paged = templates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const resetForm = () => { setName(""); setSubject(""); setAiPrompt(""); setShowAiInput(false); setEditingId(null); if (editor) editor.commands.setContent(""); };

  const handleSave = async () => {
    if (!name.trim()) return; const body = editor?.getHTML() || editor?.getText() || "";
    await fetch("/api/email-templates", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, name, subject, body }) });
    resetForm(); setShowAdd(false); fetchTemplates();
  };
  const handleDelete = async (id: string) => { await fetch("/api/email-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setDeleteConfirm(null); fetchTemplates(); };
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !editor) return; setAiStreaming(true);
    try { const res = await fetch("/api/mails/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt, context: `Email template subject: ${subject}` }) }); if (!res.ok) throw new Error("AI failed"); const reader = res.body?.getReader(); if (!reader) return; const dec = new TextDecoder(); let full = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; full += dec.decode(value, { stream: true }); const html = "<p>" + full.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + "</p>"; editor.commands.setContent(html); }
      setAiPrompt(""); setShowAiInput(false);
    } catch (err) { console.error(err) } finally { setAiStreaming(false); }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8"><h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Email Templates</h1><Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="size-3.5" />Add Template</Button></div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse"><thead><tr className="border-b border-gray-100 bg-[#fafafa]"><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Subject</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Created</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-400">No templates yet.</td></tr> : paged.map(t => <tr key={t.id} className="hover:bg-gray-50 transition"><td className="py-3 px-5 text-gray-700 font-medium">{t.name}</td><td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{t.subject}</td><td className="py-3 px-5 text-gray-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td><td className="py-3 px-5 text-right"><RowActions actions={[{ label: "View", onClick: () => setViewTemplate(t) }, { label: "Edit", onClick: () => { setName(t.name); setSubject(t.subject); setEditingId(t.id); if (editor) editor.commands.setContent(t.body); setShowAdd(true); } }, { label: "Delete", onClick: () => setDeleteConfirm(t.id) }]} /></td></tr>))}
          </tbody>
        </table>
        {totalPages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white"><span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span><div className="flex items-center gap-3"><button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronLeft className="size-4" /></button><button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronRight className="size-4" /></button></div></div>}
      </div>
      <TemplateViewSheet template={viewTemplate} onClose={() => setViewTemplate(null)} />
      <Sheet open={showAdd} onOpenChange={o => { if (!o) { setShowAdd(false); resetForm(); } }}>
        <SheetContent className="sm:max-w-2xl p-0 gap-0"><SheetHeader className="px-6 pt-6 pb-4 border-b"><SheetTitle>{editingId ? "Edit Template" : "New Template"}</SheetTitle><SheetDescription>Create an email template with rich text.</SheetDescription></SheetHeader>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Name</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Email" /></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Subject</label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" /></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Body</label>
              {editor && <div className="flex items-center gap-1 border rounded-t-md px-2 py-1 bg-muted/20"><button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("bold") && "bg-muted")}><Bold className="h-3.5 w-3.5" /></button><button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("italic") && "bg-muted")}><Italic className="h-3.5 w-3.5" /></button><button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("bulletList") && "bg-muted")}><List className="h-3.5 w-3.5" /></button><button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1 rounded hover:bg-muted", editor.isActive("orderedList") && "bg-muted")}><ListOrdered className="h-3.5 w-3.5" /></button><div className="ml-auto">{!showAiInput && <button onClick={() => setShowAiInput(true)} className="p-1 rounded hover:bg-muted text-yellow-600" title="AI Write"><Sparkles className="h-3.5 w-3.5" /></button>}</div></div>}
              {showAiInput && <div className="border-x border-t p-2 bg-muted/10 space-y-2"><div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-yellow-600 shrink-0" /><Input placeholder="Describe the email template you want..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="text-xs border-0 h-7 focus-visible:ring-0" onKeyDown={e => { if (e.key === "Enter") handleAiGenerate(); }} /></div><div className="flex justify-end gap-1">{aiStreaming ? <span className="text-xs text-muted-foreground">Generating...</span> : <Button size="sm" onClick={handleAiGenerate} disabled={!aiPrompt.trim()} className="h-7 text-xs"><Sparkles className="h-3 w-3 mr-1" />Generate</Button>}</div></div>}
              <div className="border rounded-b-md min-h-[250px]"><EditorContent editor={editor} /></div>
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t"><SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose><Button onClick={handleSave} disabled={!name.trim()}>{editingId ? "Update" : "Create"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
      <Dialog open={!!deleteConfirm} onOpenChange={o => { if (!o) setDeleteConfirm(null); }}><DialogContent className="sm:max-w-[400px]"><DialogHeader><DialogTitle>Delete Template</DialogTitle><DialogDescription>Are you sure you want to delete this template? This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button></DialogFooter></DialogContent></Dialog>
    </MainLayout>
  );
}

function TemplateViewSheet({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const editor = useEditor({ extensions: [StarterKit], content: template?.body || "", editable: false, editorProps: { attributes: { class: "text-sm max-w-none focus:outline-none p-3 leading-relaxed" } } });
  useEffect(() => { if (editor && template) editor.commands.setContent(template.body || ""); }, [template?.id, editor]);
  if (!template) return null;
  return <Sheet open={!!template} onOpenChange={o => { if (!o) onClose(); }}><SheetContent className="sm:max-w-xl"><SheetHeader><SheetTitle>{template.name}</SheetTitle><SheetDescription className="text-xs font-medium text-gray-500 mt-1">Subject: {template.subject}</SheetDescription></SheetHeader><div className="py-4"><div className="border rounded-lg bg-white"><EditorContent editor={editor} /></div></div></SheetContent></Sheet>;
}
