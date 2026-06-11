"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react"; import StarterKit from "@tiptap/starter-kit";
import MainLayout from "@/components/main-layout"; import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Textarea } from "@/components/ui/textarea"; import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RowActions } from "@/components/row-actions";

type Signature = { id: string; name: string; content: string; isDefault: boolean; createdAt: string }; const PAGE_SIZE = 10;

export default function Page() {
  const [signatures, setSignatures] = useState<Signature[]>([]); const [showAdd, setShowAdd] = useState(false); const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState(""); const [content, setContent] = useState(""); const [isDefault, setIsDefault] = useState(false); const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); const [viewSignature, setViewSignature] = useState<Signature | null>(null);

  const fetchSignatures = () => { fetch("/api/email-signatures").then(r => r.json()).then(setSignatures); }; useEffect(() => { fetchSignatures(); }, []);
  const totalPages = Math.ceil(signatures.length / PAGE_SIZE); const paged = signatures.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const resetForm = () => { setName(""); setContent(""); setIsDefault(false); setEditingId(null); };

  const handleSave = async () => {
    if (!name.trim()) return;
    await fetch("/api/email-signatures", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, name, content, isDefault }) });
    resetForm(); setShowAdd(false); fetchSignatures();
  };
  const handleDelete = async (id: string) => { await fetch("/api/email-signatures", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setDeleteConfirm(null); fetchSignatures(); };
  const handleSetDefault = async (id: string) => { await fetch("/api/email-signatures", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isDefault: true }) }); fetchSignatures(); };
  const openEdit = (s: Signature) => { setName(s.name); setContent(s.content); setIsDefault(s.isDefault); setEditingId(s.id); setShowAdd(true); };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8"><h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Email Signatures</h1><Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="size-3.5" />Add Signature</Button></div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse"><thead><tr className="border-b border-gray-100 bg-[#fafafa]"><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Default</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Preview</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Created</th><th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-gray-400">No signatures yet.</td></tr> : paged.map(s => <tr key={s.id} className="hover:bg-gray-50 transition"><td className="py-3 px-5 text-gray-700 font-medium">{s.name}</td>
              <td className="py-3 px-5">{s.isDefault ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200"><Star className="size-3" />Default</span> : <button onClick={() => handleSetDefault(s.id)} className="text-[11px] text-gray-400 hover:text-yellow-500 transition-colors">Set as default</button>}</td>
              <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{s.content}</td><td className="py-3 px-5 text-gray-500">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
              <td className="py-3 px-5 text-right"><RowActions actions={[{ label: "View", onClick: () => setViewSignature(s) }, { label: "Edit", onClick: () => openEdit(s) }, { label: "Delete", onClick: () => setDeleteConfirm(s.id) }]} /></td></tr>)}
          </tbody>
        </table>
        {totalPages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white"><span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span><div className="flex items-center gap-3"><button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronLeft className="size-4" /></button><button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronRight className="size-4" /></button></div></div>}
      </div>
      <SignatureViewSheet signature={viewSignature} onClose={() => setViewSignature(null)} />
      <Sheet open={showAdd} onOpenChange={o => { if (!o) { setShowAdd(false); resetForm(); } }}>
        <SheetContent className="sm:max-w-xl"><SheetHeader><SheetTitle>{editingId ? "Edit Signature" : "New Signature"}</SheetTitle><SheetDescription>Create an email signature. Default signatures are auto-appended to outgoing emails.</SheetDescription></SheetHeader>
          <div className="space-y-4 py-4"><div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Name</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Work Signature" /></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Signature Content</label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="John Doe&#10;Marketing Manager&#10;IntelliLabs&#10;john@intellilabs.com" /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Set as default signature</span></label>
          </div>
          <SheetFooter><SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose><Button onClick={handleSave} disabled={!name.trim()}>{editingId ? "Update" : "Create"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
      <Dialog open={!!deleteConfirm} onOpenChange={o => { if (!o) setDeleteConfirm(null); }}><DialogContent className="sm:max-w-[400px]"><DialogHeader><DialogTitle>Delete Signature</DialogTitle><DialogDescription>Are you sure you want to delete this signature? This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button></DialogFooter></DialogContent></Dialog>
    </MainLayout>
  );
}

function SignatureViewSheet({ signature, onClose }: { signature: Signature | null; onClose: () => void }) {
  const html = signature ? (signature.content || "").replace(/\n/g, "<br>") : "";
  const editor = useEditor({ extensions: [StarterKit], content: html, editable: false, editorProps: { attributes: { class: "text-sm max-w-none focus:outline-none p-3 leading-relaxed" } } });
  useEffect(() => { if (editor && signature) { const h = (signature.content || "").replace(/\n/g, "<br>"); editor.commands.setContent(h); } }, [signature?.id, editor]);
  if (!signature) return null;
  return <Sheet open={!!signature} onOpenChange={o => { if (!o) onClose(); }}><SheetContent className="sm:max-w-xl"><SheetHeader><SheetTitle>{signature.name}</SheetTitle><SheetDescription>{signature.isDefault ? "Default Signature" : "Custom Signature"}</SheetDescription></SheetHeader><div className="py-4 space-y-4">
    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border"><Avatar className="h-10 w-10"><AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">{signature.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{signature.name}</p><p className="text-xs text-muted-foreground">{signature.isDefault ? "Default" : "Custom"} Signature</p></div></div>
    <div className="border rounded-lg overflow-hidden"><EditorContent editor={editor} /></div>
    <div className="text-xs text-muted-foreground border-t pt-3 flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>IntelliLabs Mail Platform</span></div>
  </div></SheetContent></Sheet>;
}
