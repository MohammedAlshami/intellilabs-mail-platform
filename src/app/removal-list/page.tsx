'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { Can } from '@/components/can';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type RemovalItem = {
  id: string;
  email: string;
  source: string;
  reason: string;
  flaggedAt: string;
  status: 'pending' | 'removed';
};

const PAGE_SIZE = 10;

export default function RemovalListPage() {
  const [items, setItems] = useState<RemovalItem[]>([]);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addSource, setAddSource] = useState('');
  const [addReason, setAddReason] = useState('');

  useEffect(() => { fetch('/api/removal-list').then(r => r.json()).then(setItems); }, []);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async () => {
    if (!addEmail) return;
    const res = await fetch('/api/removal-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail, source: addSource || 'Manual entry', reason: addReason || 'Manual flag' }),
    });
    const { id } = await res.json();
    setItems([{ id, email: addEmail, source: addSource || 'Manual entry', reason: addReason || 'Manual flag', flaggedAt: new Date().toISOString(), status: 'pending' }, ...items]);
    setShowAdd(false);
    setAddEmail('');
    setAddSource('');
    setAddReason('');
  };

  const handleRemove = async (id: string) => {
    await fetch('/api/removal-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'removed' }),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'removed' as const } : i));
  };

  const handleExport = () => {
    const csv = ['Email,Source,Reason,Flagged Date,Status'];
    items.forEach(i => { csv.push(`${i.email},${i.source},${i.reason},${new Date(i.flaggedAt).toLocaleDateString()},${i.status}`); });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `removal-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Removal List</h1>
        <div className="flex items-center gap-2">
          <Can page="removal-list" action="export"><button onClick={handleExport} disabled={items.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-[6px] transition-colors shadow-sm disabled:opacity-50">
            <Download className="size-3.5" /> Export CSV
          </button></Can>
          <Can page="removal-list" action="create"><Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-3.5" /> Add Entry
          </Button></Can>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Email</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Source</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Reason</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Flagged Date</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No items in removal list.</td></tr>
            ) : (
              paged.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{item.email}</td>
                  <td className="py-3 px-5 text-gray-500">{item.source}</td>
                  <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{item.reason}</td>
                  <td className="py-3 px-5 text-gray-500">{new Date(item.flaggedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-5">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${item.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                      {item.status === 'pending' ? 'Pending' : 'Removed'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <RowActions actions={[
                      ...(item.status === 'pending' ? [{ label: 'Mark Removed', onClick: () => handleRemove(item.id) }] : []),
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
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Add to Removal List</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Flag an email for removal from future campaigns</SheetDescription>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Email</label>
              <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="bounce@example.com" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Source</label>
              <input value={addSource} onChange={e => setAddSource(e.target.value)} placeholder="Website or campaign name" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Reason</label>
              <select value={addReason} onChange={e => setAddReason(e.target.value)} className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300">
                <option value="">Select reason...</option>
                <option value="Hard Bounce">Hard Bounce</option>
                <option value="Soft Bounce">Soft Bounce</option>
                <option value="Unsubscribed">Unsubscribed</option>
                <option value="Spam Complaint">Spam Complaint</option>
                <option value="Invalid Email">Invalid Email</option>
                <option value="Out of Office">Out of Office</option>
                <option value="Resigned">Resigned / Left Company</option>
                <option value="Manual Flag">Manual Flag</option>
              </select>
            </div>
            <div className="pt-2">
              <Button onClick={handleAdd} disabled={!addEmail} className="w-full">
                Add to Removal List
              </Button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
