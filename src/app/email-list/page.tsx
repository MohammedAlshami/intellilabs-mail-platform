'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, ShieldCheck, ShieldX, Loader2, Trash2, X } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { Can } from '@/components/can';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';

const EMAIL_EXTRACT_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

type EmailList = {
  id: string; name: string; emails: string; count: number; source?: string; createdAt: string;
};

type VerifyResult = { email: string; valid: boolean; reason: string };

const PAGE_SIZE = 15;

function extractEmails(raw: string): string[] {
  const seen = new Set<string>();
  const matches = raw.match(EMAIL_EXTRACT_RE) || [];
  return matches.map(e => e.toLowerCase().trim()).filter(e => {
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

export default function EmailListsPage() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [viewList, setViewList] = useState<EmailList | null>(null);
  const [addName, setAddName] = useState('');
  const [addRawText, setAddRawText] = useState('');
  const [addSource, setAddSource] = useState('');
  const [addEmails, setAddEmails] = useState<string[]>([]);
  const [addVerifying, setAddVerifying] = useState(false);
  const [addVerifyResults, setAddVerifyResults] = useState<VerifyResult[] | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [viewVerifying, setViewVerifying] = useState(false);
  const [viewVerifyResults, setViewVerifyResults] = useState<VerifyResult[] | null>(null);

  const fetchLists = () => { fetch('/api/email-lists').then(r => r.json()).then(setLists); };
  useEffect(() => { fetchLists(); }, []);

  const totalPages = Math.ceil(lists.length / PAGE_SIZE);
  const paged = lists.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleRawTextChange = (val: string) => {
    setAddRawText(val);
    setAddEmails(extractEmails(val));
    setAddVerifyResults(null);
  };

  const removeAddEmail = (email: string) => {
    setAddEmails(prev => prev.filter(e => e !== email));
    setAddVerifyResults(null);
  };

  const handleAddVerify = async () => {
    if (addEmails.length === 0) return;
    setAddVerifying(true);
    setAddVerifyResults(null);
    try {
      const res = await fetch('/api/email-lists/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: addEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setAddVerifyResults(data.results || []);
    } catch {
      setAddVerifyResults(addEmails.map(e => ({ email: e, valid: false, reason: 'Verification service unavailable' })));
    }
    setAddVerifying(false);
  };

  const handleAddRemoveInvalid = () => {
    if (!addVerifyResults) return;
    const valid = addVerifyResults.filter(r => r.valid).map(r => r.email);
    setAddEmails(valid);
    setAddVerifyResults(null);
  };

  const handleAdd = async () => {
    if (!addName || addEmails.length === 0) return;
    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch('/api/email-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, emails: addEmails.join(', '), source: addSource }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create list');
      fetchLists();
      setShowAdd(false);
      resetAddForm();
    } catch (e: any) {
      setAddError(e.message || 'Failed to create list');
    }
    setAddSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/email-lists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchLists();
  };

  const handleViewVerify = async (list: EmailList) => {
    setViewVerifying(true);
    setViewVerifyResults(null);
    const emails = list.emails.split(/,\s*/).map(e => e.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/email-lists/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      setViewVerifyResults(data.results);
    } catch {
      setViewVerifyResults(emails.map(e => ({ email: e, valid: false, reason: 'Verification failed' })));
    }
    setViewVerifying(false);
  };

  const handleViewRemoveInvalid = async (list: EmailList) => {
    if (!viewVerifyResults) return;
    const validEmails = viewVerifyResults.filter(r => r.valid).map(r => r.email).join(', ');
    const res = await fetch('/api/email-lists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: list.id, emails: validEmails }),
    });
    const data = await res.json();
    setLists(prev => prev.map(l => l.id === list.id ? { ...l, count: data.count } : l));
    setViewList({ ...list, emails: validEmails, count: data.count });
    setViewVerifyResults(null);
  };

  const resetAddForm = () => {
    setAddName('');
    setAddRawText('');
    setAddEmails([]);
    setAddSource('');
    setAddVerifyResults(null);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Email Lists</h1>
        <div className="flex items-center gap-2">
          <Can page="email-lists" action="export"><ExportDropdown data={lists.map(l => ({ Name: l.name, Emails: l.count, Source: l.source || '' }))} filename="email-lists" columnOrder={["Name", "Emails", "Source"]} /></Can>
          <Can page="email-lists" action="create"><Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-3.5" /> Add List
          </Button></Can>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Emails</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Source</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Created</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No email lists yet.</td></tr>
            ) : (
              paged.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{list.name}</td>
                  <td className="py-3 px-5 text-gray-500">{list.count} emails</td>
                  <td className="py-3 px-5 text-gray-500 max-w-[140px] truncate">{list.source || '—'}</td>
                  <td className="py-3 px-5 text-gray-500">{new Date(list.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-5 text-right">
                    <RowActions actions={[
                      { label: 'View', onClick: () => setViewList(list) },
                      { label: 'Export', onClick: () => setViewList(list), permission: { page: 'email-lists', action: 'export' } },
                      { label: 'Delete', onClick: () => handleDelete(list.id), className: 'text-red-500', permission: { page: 'email-lists', action: 'delete' } },
                    ]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); resetAddForm(); } }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Add Email List</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Paste any text — emails are extracted automatically</SheetDescription>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">List Name</label>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Q3 Leads" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Source</label>
              <input value={addSource} onChange={e => setAddSource(e.target.value)} placeholder="e.g. Website scrape, Manual upload" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Raw Content</label>
              <textarea value={addRawText} onChange={e => handleRawTextChange(e.target.value)} placeholder="Paste any text — emails are extracted automatically&#10;e.g. John &lt;john@example.com&gt;, Jane jane@co.com" rows={5} className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none" />
            </div>
            {addEmails.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{addEmails.length} email{addEmails.length !== 1 ? 's' : ''} found</label>
                  <div className="flex items-center gap-1">
                    {!addVerifyResults && (
                      <Button size="sm" variant="outline" onClick={handleAddVerify} disabled={addVerifying || addEmails.length === 0} className="h-6 text-[10px] px-2">
                        {addVerifying ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
                        {addVerifying ? 'Verifying...' : 'Verify'}
                      </Button>
                    )}
                  </div>
                </div>
                {addVerifyResults && (
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-green-600 font-medium flex items-center gap-1"><ShieldCheck className="size-3" /> {addVerifyResults.filter(r => r.valid).length} valid</span>
                    <span className="text-red-500 font-medium flex items-center gap-1"><ShieldX className="size-3" /> {addVerifyResults.filter(r => !r.valid).length} invalid</span>
                    {addVerifyResults.some(r => !r.valid) && (
                      <Button size="sm" variant="destructive" onClick={handleAddRemoveInvalid} className="h-6 text-[10px] px-2">
                        <Trash2 className="size-3 mr-0.5" /> Remove Invalid
                      </Button>
                    )}
                  </div>
                )}
                <div className="border border-[#e5e7eb] rounded-[5px] max-h-[180px] overflow-y-auto divide-y divide-gray-100">
                  {addEmails.map((email) => {
                    const vr = addVerifyResults?.find(r => r.email === email);
                    return (
                      <div key={email} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-gray-50 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[12px] font-mono text-gray-700 truncate">{email}</span>
                          {vr && (
                            vr.valid
                              ? <ShieldCheck className="size-3 text-green-500 shrink-0" />
                              : <ShieldX className="size-3 text-red-500 shrink-0" title={vr.reason} />
                          )}
                        </div>
                        <button onClick={() => removeAddEmail(email)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {addError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</div>}
            <div className="pt-2">
              <Button onClick={handleAdd} disabled={!addName || addEmails.length === 0 || addSaving} className="w-full">
                {addSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {addSaving ? 'Creating...' : `Create List (${addEmails.length} email${addEmails.length !== 1 ? 's' : ''})`}
              </Button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewList} onOpenChange={(o) => { if (!o) { setViewList(null); setViewVerifyResults(null); } }}>
        <SheetContent side="right" className="sm:max-w-md p-0 gap-0">
          <SheetHeader className="px-4 pt-6 pb-3 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-[16px] font-semibold text-[#111827]">{viewList?.name}</SheetTitle>
                <SheetDescription className="text-[12px] text-gray-500">{viewList?.count} emails {viewList?.source ? `· ${viewList.source}` : ''}</SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                {viewList && !viewVerifyResults && (
                  <Button size="sm" variant="outline" onClick={() => handleViewVerify(viewList)} disabled={viewVerifying}>
                    {viewVerifying ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                    {viewVerifying ? 'Verifying...' : 'Verify'}
                  </Button>
                )}
                <Can page="email-lists" action="export">{viewList && <ExportDropdown
                  data={viewList.emails.split(/,\s*/).map((e: string, i: number) => ({ '#': i + 1, Email: e.trim() }))}
                  filename={viewList.name.toLowerCase().replace(/\s+/g, '-')}
                  columnOrder={['#', 'Email']}
                />}</Can>
              </div>
            </div>
            {viewVerifyResults && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 font-medium flex items-center gap-1"><ShieldCheck className="size-3" /> {viewVerifyResults.filter(r => r.valid).length} valid</span>
                  <span className="text-red-500 font-medium flex items-center gap-1"><ShieldX className="size-3" /> {viewVerifyResults.filter(r => !r.valid).length} invalid</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => setViewVerifyResults(null)} className="h-7 text-xs">Cancel</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleViewRemoveInvalid(viewList!)} disabled={viewVerifyResults.filter(r => !r.valid).length === 0} className="h-7 text-xs">
                    <Trash2 className="size-3 mr-1" /> Remove Invalid
                  </Button>
                </div>
              </div>
            )}
          </SheetHeader>
          {viewList && (
            <div className="mx-4 mt-4 mb-4 bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#fafafa] sticky top-0">
                      <th className="py-2.5 px-4 text-xs font-normal text-[#9ca3af] w-10">#</th>
                      <th className="py-2.5 px-4 text-xs font-normal text-[#9ca3af]">Email Address</th>
                      {viewVerifyResults && <th className="py-2.5 px-4 text-xs font-normal text-[#9ca3af] w-20">Status</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {viewList.emails.split(/,\s*/).map((email, i) => {
                      const vr = viewVerifyResults?.find(r => r.email === email.trim().toLowerCase());
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="py-2.5 px-4 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-4 text-gray-700 font-mono text-[12px] break-all">{email}</td>
                          {viewVerifyResults && (
                            <td className="py-2.5 px-4">
                              {vr ? (
                                vr.valid
                                  ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600"><ShieldCheck className="size-3" /> Valid</span>
                                  : <span className="inline-flex items-center gap-1 text-[11px] text-red-500" title={vr.reason}><ShieldX className="size-3" /> Invalid</span>
                              ) : (
                                <span className="text-[11px] text-gray-400">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
