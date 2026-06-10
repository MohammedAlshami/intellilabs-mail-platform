'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, ExternalLink, ArrowUpRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { Website } from '@/lib/data';

const PAGE_SIZE = 10;

export default function WebsitesPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);

  const fetchWebsites = useCallback(async () => {
    try {
      const res = await fetch('/api/websites');
      const data = await res.json();
      setWebsites(data.map((w: any) => ({ ...w, services: typeof w.services === 'string' ? JSON.parse(w.services) : w.services })));
    } catch {}
  }, []);

  useEffect(() => { fetchWebsites(); }, [fetchWebsites]);

  // Poll every 5s while any website is being crawled
  useEffect(() => {
    if (websites.some(w => w.scrapeStatus === 'scraping')) {
      const interval = setInterval(fetchWebsites, 5000);
      return () => clearInterval(interval);
    }
  }, [websites, fetchWebsites]);
  const [page, setPage] = useState(0);
  const [viewWebsite, setViewWebsite] = useState<Website | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');

  const handleDelete = async (id: string) => {
    await fetch(`/api/websites/${id}`, { method: 'DELETE' });
    fetchWebsites();
  };

  const totalPages = Math.ceil(websites.length / PAGE_SIZE);
  const paged = websites.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async () => {
    if (!addUrl) return;
    const id = String(Date.now());
    const domain = addUrl.replace(/https?:\/\//, "").split("/")[0].split("?")[0];
    const suggName = domain.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + domain.replace("www.", "").split(".")[0].slice(1);

    // Save to DB immediately with scraping status
    await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, url: addUrl, name: suggName, scrapeStatus: 'scraping' }),
    });

    setShowAdd(false);
    setAddUrl('');
    fetchWebsites();

    // Run crawl + scrape
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const emailsStr = data.emails?.join(', ') || '';
        const wsName = data.name || suggName;
        await fetch('/api/websites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, scrapeStatus: 'done', emails: emailsStr, name: wsName, description: data.description || data.summary || '', summary: data.summary, services: data.services }),
        });
        if (emailsStr) {
          await fetch('/api/email-lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${wsName} - Leads`, emails: emailsStr, source: addUrl }),
          });
        }
      } else {
        await fetch('/api/websites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scrapeStatus: 'error' }) });
      }
    } catch {
      await fetch('/api/websites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scrapeStatus: 'error' }) });
    }
    fetchWebsites();
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Websites</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="size-3.5" /> Add Website
        </Button>
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
                    <RowActions actions={[
                      { label: 'View', onClick: () => router.push(`/websites/${w.id}`) },
                      { label: 'Delete', onClick: () => handleDelete(w.id), className: 'text-red-500' },
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

      {/* Add Website Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) setShowAdd(false); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Add Website</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Paste a URL and we'll crawl it automatically</SheetDescription>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">URL</label>
              <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://example.com" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="pt-2">
              <Button onClick={handleAdd} disabled={!addUrl} className="w-full">
                Start Crawl
              </Button>
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
                <Button onClick={() => { setViewWebsite(null); router.push(`/websites/${viewWebsite.id}`); }} className="w-full">
                  <ArrowUpRight className="size-3.5" /> Go to Website Page
                </Button>
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
  if (status === 'scraping') return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200 animate-pulse">Crawling...</span>;
  if (status === 'done') return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">Done</span>;
  if (status === 'error') return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200">Error</span>;
  return null;
}
