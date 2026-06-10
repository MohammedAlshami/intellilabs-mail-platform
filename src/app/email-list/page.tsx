'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';

type EmailList = {
  id: string; name: string; emails: string; count: number; source?: string; createdAt: string;
};

const PAGE_SIZE = 15;

export default function EmailListsPage() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [viewList, setViewList] = useState<EmailList | null>(null);
  const [addName, setAddName] = useState('');
  const [addEmails, setAddEmails] = useState('');
  const [addSource, setAddSource] = useState('');

  const fetchLists = () => { fetch('/api/email-lists').then(r => r.json()).then(setLists); };
  useEffect(() => { fetchLists(); }, []);

  const totalPages = Math.ceil(lists.length / PAGE_SIZE);
  const paged = lists.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async () => {
    if (!addName || !addEmails) return;
    await fetch('/api/email-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName, emails: addEmails, source: addSource }),
    });
    fetchLists();
    setShowAdd(false);
    setAddName('');
    setAddEmails('');
    setAddSource('');
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/email-lists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchLists();
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Email Lists</h1>
        <div className="flex items-center gap-2">
          <ExportDropdown data={lists.map(l => ({ Name: l.name, Emails: l.count, Source: l.source || '' }))} filename="email-lists" columnOrder={["Name", "Emails", "Source"]} />
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-3.5" /> Add List
          </Button>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
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
                      { label: 'Export', onClick: () => setViewList(list) },
                      { label: 'Delete', onClick: () => handleDelete(list.id), className: 'text-red-500' },
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

      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) setShowAdd(false); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Add Email List</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Create a new email collection</SheetDescription>
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
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Emails</label>
              <textarea value={addEmails} onChange={e => setAddEmails(e.target.value)} placeholder="Paste emails here, one per line or comma-separated&#10;email1@example.com&#10;email2@example.com" rows={10} className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none" />
            </div>
            <div className="pt-2">
              <Button onClick={handleAdd} disabled={!addName || !addEmails} className="w-full">
                Create List
              </Button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewList} onOpenChange={(o) => { if (!o) setViewList(null); }}>
        <SheetContent side="right" className="sm:max-w-md p-0 gap-0">
          <SheetHeader className="px-4 pt-6 pb-3 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-[16px] font-semibold text-[#111827]">{viewList?.name}</SheetTitle>
                <SheetDescription className="text-[12px] text-gray-500">{viewList?.count} emails {viewList?.source ? `· ${viewList.source}` : ''}</SheetDescription>
              </div>
              {viewList && (
                <ExportDropdown
                  data={viewList.emails.split(/,\s*/).map((e: string, i: number) => ({ '#': i + 1, Email: e.trim() }))}
                  filename={viewList.name.toLowerCase().replace(/\s+/g, '-')}
                  columnOrder={['#', 'Email']}
                />
              )}
            </div>
          </SheetHeader>
          {viewList && (
            <div className="mx-4 mt-4 mb-4 bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#fafafa] sticky top-0">
                      <th className="py-2.5 px-4 text-xs font-normal text-[#9ca3af] w-10">#</th>
                      <th className="py-2.5 px-4 text-xs font-normal text-[#9ca3af]">Email Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {viewList.emails.split(/,\s*/).map((email, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="py-2.5 px-4 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 px-4 text-gray-700 font-mono text-[12px] break-all">{email}</td>
                      </tr>
                    ))}
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
