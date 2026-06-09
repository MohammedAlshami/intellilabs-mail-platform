'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, ChevronLeft, ChevronRight, ExternalLink, ArrowUpRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import seedWebsites, { type Website } from '@/lib/data';

const PAGE_SIZE = 10;

export default function WebsitesPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>(seedWebsites);
  const [page, setPage] = useState(0);
  const [viewWebsite, setViewWebsite] = useState<Website | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addHealthcare, setAddHealthcare] = useState(false);
  const [addEmails, setAddEmails] = useState('');
  const [addPhones, setAddPhones] = useState('');

  const totalPages = Math.ceil(websites.length / PAGE_SIZE);
  const paged = websites.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async () => {
    if (!addUrl || !addName) return;
    const id = String(Date.now());
    const newWebsite: Website = {
      id,
      url: addUrl,
      name: addName,
      category: addCategory || 'Uncategorized',
      isHealthcare: addHealthcare,
      emails: addEmails,
      phones: addPhones,
      scrapeStatus: 'scraping',
      createdAt: new Date().toISOString(),
    };
    setWebsites([newWebsite, ...websites]);
    setShowAdd(false);
    setAddUrl('');
    setAddName('');
    setAddCategory('');
    setAddHealthcare(false);
    setAddEmails('');
    setAddPhones('');

    // Trigger scraping in background
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl, websiteId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setWebsites(prev => prev.map(w =>
          w.id === id
            ? { ...w, scrapeStatus: 'done', emails: data.emails?.join(', ') || w.emails, phones: data.phones?.join(', ') || w.phones, category: data.category || w.category, isHealthcare: data.isHealthcare ?? w.isHealthcare, description: data.description || data.summary, summary: data.summary, services: data.services }
            : w
        ));
      } else {
        setWebsites(prev => prev.map(w => w.id === id ? { ...w, scrapeStatus: 'error' } : w));
      }
    } catch {
      setWebsites(prev => prev.map(w => w.id === id ? { ...w, scrapeStatus: 'error' } : w));
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Websites</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111827] hover:bg-black text-white font-semibold rounded-[6px] transition-colors shadow-sm">
          <Plus className="size-3.5" /> Add Website
        </button>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">URL</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Category</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Healthcare</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Emails</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Phones</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">No websites yet.</td></tr>
            ) : (
              paged.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{w.name}</td>
                  <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gray-700">
                      {w.url.replace(/^https?:\/\//, '')}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </td>
                  <td className="py-3 px-5 text-gray-500">{w.category}</td>
                  <td className="py-3 px-5">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${w.isHealthcare ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {w.isHealthcare ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-500 max-w-[180px] truncate">{w.emails}</td>
                  <td className="py-3 px-5 text-gray-500">{w.phones}</td>
                  <td className="py-3 px-5">{scrapeStatusBadge(w.scrapeStatus)}</td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => setViewWebsite(w)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition">
                      <Eye className="size-3.5" />
                    </button>
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

      {/* Add Website Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) setShowAdd(false); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Add Website</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Research a new client website</SheetDescription>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">URL</label>
              <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://example.com" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Website Name</label>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Company name" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Category</label>
              <input value={addCategory} onChange={e => setAddCategory(e.target.value)} placeholder="e.g. Healthcare, Technology, Real Estate" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="healthcare" checked={addHealthcare} onChange={e => setAddHealthcare(e.target.checked)} className="rounded border-gray-300 text-[#111827] focus:ring-gray-300" />
              <label htmlFor="healthcare" className="text-[13px] text-gray-700">Healthcare provider</label>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Extracted Emails</label>
              <input value={addEmails} onChange={e => setAddEmails(e.target.value)} placeholder="email@example.com, ..." className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Extracted Phones</label>
              <input value={addPhones} onChange={e => setAddPhones(e.target.value)} placeholder="+1 (555) 000-0000, ..." className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="pt-2">
              <button onClick={handleAdd} disabled={!addUrl || !addName} className="w-full py-2 bg-[#111827] hover:bg-black disabled:bg-gray-300 text-white text-[12px] font-semibold rounded-[6px] transition-colors shadow-sm">
                Add Website
              </button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>

      {/* View Website Sheet */}
      <Sheet open={!!viewWebsite} onOpenChange={(o) => { if (!o) setViewWebsite(null); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Website Details</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">View client research information</SheetDescription>
          </SheetHeader>
          {viewWebsite && (
            <div className="px-4 space-y-4 text-[13px]">
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Name</span><span className="text-gray-700">{viewWebsite.name}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">URL</span><a href={viewWebsite.url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 flex items-center gap-1">{viewWebsite.url} <ExternalLink className="size-3" /></a></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Category</span><span className="text-gray-700">{viewWebsite.category}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Healthcare</span><span className="text-gray-700">{viewWebsite.isHealthcare ? 'Yes' : 'No'}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Extracted Emails</span><span className="text-gray-700">{viewWebsite.emails || 'None'}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Status</span><span className="text-gray-700">{scrapeStatusBadge(viewWebsite.scrapeStatus)}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Extracted Phones</span><span className="text-gray-700">{viewWebsite.phones || 'None'}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Added</span><span className="text-gray-700">{new Date(viewWebsite.createdAt).toLocaleString()}</span></div>
              <div className="pt-2">
                <button onClick={() => { setViewWebsite(null); router.push(`/websites/${viewWebsite.id}`); }} className="w-full py-2 bg-[#111827] hover:bg-black text-white text-[12px] font-semibold rounded-[6px] transition-colors shadow-sm flex items-center justify-center gap-1.5">
                  <ArrowUpRight className="size-3.5" /> Go to Website Page
                </button>
              </div>
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

function scrapeStatusBadge(status?: string) {
  if (!status || status === 'idle') return null;
  if (status === 'scraping') return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200 animate-pulse">Scraping...</span>;
  if (status === 'done') return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">Done</span>;
  if (status === 'error') return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200">Error</span>;
  return null;
}
