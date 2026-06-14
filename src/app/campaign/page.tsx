'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, ArrowUpRight, Send, X, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { Can } from '@/components/can';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { SearchBar } from '@/components/shared/search-bar';
import { cn } from '@/lib/utils';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  objective?: string;
  recipients: number;
  sent: number;
  bounced: number;
  status: string;
  createdAt: string;
};

type EmailList = {
  id: string; name: string; emails: string; count: number; createdAt: string;
};

const PAGE_SIZE = 10;

function CampaignPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(0);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [bcc, setBcc] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState('');
  const [subject, setSubject] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [searchResults, setSearchResults] = useState<Campaign[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your campaign email..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] text-slate-800 [&_p:empty]:block [&_p:empty]:h-[1em]",
      },
    },
  });

  const fetchCampaigns = () => { fetch('/api/campaigns').then(r => r.json()).then(setCampaigns); };
  useEffect(() => { fetchCampaigns(); }, []);
  useEffect(() => { fetch('/api/email-lists').then(r => r.json()).then(setEmailLists); }, []);
  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      resetForm();
      setShowAdd(true);
    }
  }, [searchParams]);

  const totalPages = Math.ceil(campaigns.length / PAGE_SIZE);
  const paged = campaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetForm = () => {
    setName('');
    setRecipients([]);
    setRecipientInput('');
    setCc([]);
    setCcInput('');
    setBcc([]);
    setBccInput('');
    setSubject('');
    setShowCc(false);
    setShowBcc(false);
    setSelectedListId('');
    if (editor) editor.commands.setContent('');
  };

  const addRecipient = () => {
    const val = recipientInput.trim().toLowerCase();
    if (val && !recipients.includes(val)) setRecipients([...recipients, val]);
    setRecipientInput('');
  };
  const removeRecipient = (email: string) => setRecipients(recipients.filter(r => r !== email));
  const handleRecipientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addRecipient(); }
    else if (e.key === "Backspace" && recipientInput === "" && recipients.length > 0) setRecipients(recipients.slice(0, -1));
  };
  const addCc = () => { const val = ccInput.trim(); if (val && !cc.includes(val)) setCc([...cc, val]); setCcInput(""); };
  const removeCc = (email: string) => setCc(cc.filter(r => r !== email));
  const handleCcKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addCc(); }
    else if (e.key === "Backspace" && ccInput === "" && cc.length > 0) setCc(cc.slice(0, -1));
  };
  const addBcc = () => { const val = bccInput.trim(); if (val && !bcc.includes(val)) setBcc([...bcc, val]); setBccInput(""); };
  const removeBcc = (email: string) => setBcc(bcc.filter(r => r !== email));
  const handleBccKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addBcc(); }
    else if (e.key === "Backspace" && bccInput === "" && bcc.length > 0) setBcc(bcc.slice(0, -1));
  };

  const handleListSelect = (listId: string) => {
    setSelectedListId(listId);
    const list = emailLists.find(l => l.id === listId);
    if (list) {
      const emails = list.emails.split(/,\s*/).filter(Boolean);
      setRecipients(emails);
    }
  };

  const handleSave = async (status: 'draft' | 'sending') => {
    if (!name.trim() || recipients.length === 0) return;
    setSaving(true);
    setSaveError('');
    const body = editor?.getHTML() || editor?.getText() || '';
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          emailContent: body,
          recipientEmails: recipients.join('\n'),
          cc: cc.join(', '),
          bcc: bcc.join(', '),
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save campaign');
      setShowAdd(false);
      resetForm();
      fetchCampaigns();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save campaign');
    }
    setSaving(false);
  };

  const displayCampaigns = searchResults ?? campaigns;
  const displayTotal = searchResults !== null ? searchResults.length : campaigns.length;
  const displayPaged = displayCampaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const displayTotalPages = Math.ceil(displayCampaigns.length / PAGE_SIZE);

  if (page >= displayTotalPages && displayTotalPages > 0) setPage(0);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Campaigns</h1>
        <div className="flex items-center gap-2">
          <SearchBar table="campaigns" placeholder="Search campaigns..." onResults={(data, total, q) => { setSearchResults(data as Campaign[]); setSearchQuery(q); setPage(0); }} onClear={() => { setSearchResults(null); setSearchQuery(""); setPage(0); }} />
          <Can page="campaigns" action="export"><ExportDropdown data={displayCampaigns.map(c => ({ Name: c.name, Subject: c.subject, Recipients: c.recipients, Sent: c.sent, Bounced: c.bounced, Status: c.status }))} filename="campaigns" columnOrder={["Name", "Subject", "Recipients", "Sent", "Bounced", "Status"]} /></Can>
          <Can page="campaigns" action="create"><Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus className="size-3.5" /> Add Campaign
          </Button></Can>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Subject</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Recipients</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Sent</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Bounced</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Created</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {displayPaged.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">{searchQuery ? `No campaigns match "${searchQuery}".` : "No campaigns yet."}</td></tr>
            ) : (
              displayPaged.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{c.name}</td>
                  <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{c.subject}</td>
                  <td className="py-3 px-5 text-gray-500">{c.recipients}</td>
                  <td className="py-3 px-5 text-gray-500">{c.sent}</td>
                  <td className="py-3 px-5 text-gray-500">{c.bounced}</td>
                  <td className="py-3 px-5">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                      c.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' :
                      c.status === 'sending' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-5 text-right">
                    <RowActions actions={[
                      { label: 'View', onClick: () => setViewCampaign(c) },
                    ]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {displayTotalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500">Page {page + 1} of {displayTotalPages} ({displayTotal} total)</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(displayTotalPages - 1, p + 1))} disabled={page >= displayTotalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Campaign Sheet */}
      <div className={cn(!!viewCampaign && "fixed inset-0 z-50 bg-black/80")} style={{ display: !!viewCampaign ? undefined : 'none' }} />
      {viewCampaign && (
        <div className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-white shadow-xl border-l border-gray-200 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-semibold text-[#111827]">Campaign Details</h2>
            <button onClick={() => setViewCampaign(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
          </div>
          <div className="space-y-5 text-[13px]">
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Name</span><span className="text-gray-700">{viewCampaign.name}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Subject</span><span className="text-gray-700">{viewCampaign.subject}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Recipients</span><span className="text-gray-700">{viewCampaign.recipients}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Sent</span><span className="text-gray-700">{viewCampaign.sent}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Bounced</span><span className="text-gray-700">{viewCampaign.bounced}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Status</span><span className="text-gray-700 capitalize">{viewCampaign.status}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Created</span><span className="text-gray-700">{new Date(viewCampaign.createdAt).toLocaleString()}</span></div>
            <div className="pt-2">
              <Button onClick={() => router.push(`/campaign/${viewCampaign.id}`)} className="w-full">
                View Details <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); resetForm(); } }}>
        <SheetContent className="sm:max-w-2xl p-0 gap-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <SheetTitle className="text-[18px] font-semibold">New Campaign</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Compose your campaign email</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Campaign Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 Product Launch" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[6px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400" />
            </div>

            <div className="border-b pb-0">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 text-xs text-gray-400 shrink-0">To:</span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {recipients.map(email => (
                    <span key={email} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                      {email}
                      <button type="button" onClick={() => removeRecipient(email)} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input type="text" value={recipientInput} onChange={e => setRecipientInput(e.target.value)} onKeyDown={handleRecipientKeyDown} onBlur={addRecipient} placeholder={recipients.length === 0 ? "Add recipient or select a list..." : "Add another..."} className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
                </div>
                <Select value={selectedListId} onValueChange={handleListSelect}>
                  <SelectTrigger className="w-[180px] h-8 text-xs shrink-0">
                    <SelectValue placeholder="Pick a list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {emailLists.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[12px] text-gray-400">No lists found</div>
                    ) : emailLists.map(list => (
                      <SelectItem key={list.id} value={list.id} className="text-xs">{list.name} ({list.count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-1 mb-2 ml-[28px]">
                <button type="button" onClick={() => setShowCc(!showCc)} className={`text-[11px] px-2 py-0.5 rounded transition-colors ${showCc ? "bg-slate-200 text-slate-700" : "text-gray-400 hover:text-gray-600"}`}>CC</button>
                <button type="button" onClick={() => setShowBcc(!showBcc)} className={`text-[11px] px-2 py-0.5 rounded transition-colors ${showBcc ? "bg-slate-200 text-slate-700" : "text-gray-400 hover:text-gray-600"}`}>BCC</button>
              </div>
              {showCc && (
                <div className="flex items-start gap-2 ml-4 pb-2">
                  <span className="mt-1.5 text-xs text-gray-400 shrink-0">CC:</span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {cc.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                        {email}
                        <button type="button" onClick={() => removeCc(email)} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <input type="text" value={ccInput} onChange={e => setCcInput(e.target.value)} onKeyDown={handleCcKeyDown} onBlur={addCc} placeholder="Add CC..." className="min-w-[100px] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
                    <Select value="" onValueChange={(v) => { const list = emailLists.find(l => l.id === v); if (list) { const emails = list.emails.split(/,\s*/).filter(Boolean); setCc(prev => [...new Set([...prev, ...emails])]); } }}>
                      <SelectTrigger className="h-6 text-[10px] px-1.5 border-0 shadow-none text-gray-400 hover:text-gray-600 w-auto gap-0">
                        <SelectValue placeholder="+List" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailLists.map(list => (
                          <SelectItem key={list.id} value={list.id} className="text-xs">{list.name} ({list.count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {showBcc && (
                <div className="flex items-start gap-2 ml-4 pb-2">
                  <span className="mt-1.5 text-xs text-gray-400 shrink-0">BCC:</span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {bcc.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                        {email}
                        <button type="button" onClick={() => removeBcc(email)} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <input type="text" value={bccInput} onChange={e => setBccInput(e.target.value)} onKeyDown={handleBccKeyDown} onBlur={addBcc} placeholder="Add BCC..." className="min-w-[100px] flex-1 bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
                    <Select value="" onValueChange={(v) => { const list = emailLists.find(l => l.id === v); if (list) { const emails = list.emails.split(/,\s*/).filter(Boolean); setBcc(prev => [...new Set([...prev, ...emails])]); } }}>
                      <SelectTrigger className="h-6 text-[10px] px-1.5 border-0 shadow-none text-gray-400 hover:text-gray-600 w-auto gap-0">
                        <SelectValue placeholder="+List" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailLists.map(list => (
                          <SelectItem key={list.id} value={list.id} className="text-xs">{list.name} ({list.count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-b pb-2">
              <span className="text-xs text-gray-400 shrink-0">Subject:</span>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Campaign subject" className="flex-1 bg-transparent text-sm font-medium text-slate-800 focus:outline-none" />
            </div>

            <div>
              {editor && (
                <div className="flex items-center gap-1 px-2 py-1">
                  <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1 rounded hover:bg-slate-100 ${editor.isActive("bold") ? "bg-slate-200" : ""}`}><Bold className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1 rounded hover:bg-slate-100 ${editor.isActive("italic") ? "bg-slate-200" : ""}`}><Italic className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1 rounded hover:bg-slate-100 ${editor.isActive("underline") ? "bg-slate-200" : ""}`}><UnderlineIcon className="h-3.5 w-3.5" /></button>
                  <div className="mx-1 h-4 w-px bg-gray-200" />
                  <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1 rounded hover:bg-slate-100 ${editor.isActive("bulletList") ? "bg-slate-200" : ""}`}><List className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1 rounded hover:bg-slate-100 ${editor.isActive("orderedList") ? "bg-slate-200" : ""}`}><ListOrdered className="h-3.5 w-3.5" /></button>
                  <div className="mx-1 h-4 w-px bg-gray-200" />
                  <button type="button" onClick={() => { const url = window.prompt("Enter URL"); if (url) editor.chain().focus().setLink({ href: url }).run() }} className={`p-1 rounded hover:bg-slate-100 ${editor.isActive("link") ? "bg-slate-200" : ""}`}><LinkIcon className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="min-h-[200px]"><EditorContent editor={editor} /></div>
            </div>
          </div>

          <SheetFooter className="px-5 py-3 border-t shrink-0 flex flex-col gap-2">
            {saveError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</div>}
            <div className="flex items-center justify-between">
              <SheetClose asChild><Button variant="outline" size="sm">Cancel</Button></SheetClose>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleSave('draft')} disabled={!name.trim() || recipients.length === 0 || saving}>Save as Draft</Button>
                <Button size="sm" onClick={() => handleSave('sending')} disabled={!name.trim() || recipients.length === 0 || saving}>
                  {saving ? <><Loader2 className="size-3.5 animate-spin" /> Saving...</> : <><Send className="size-3.5" /> Launch Campaign</>}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

export default function CampaignPage() {
  return <Suspense fallback={null}><CampaignPageInner /></Suspense>;
}
