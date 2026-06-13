'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, ExternalLink, ArrowUpRight, Check, Loader, Search, Globe } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { Can } from '@/components/can';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtStep } from '@/components/ai-elements/chain-of-thought';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import type { Website } from '@/lib/data';

const PAGE_SIZE = 10;

const SCRAPE_STEPS = [
  { step: 1, title: 'Initializing', description: 'Preparing the email crawler' },
  { step: 2, title: 'Crawling pages', description: 'Scanning website pages for email addresses' },
  { step: 3, title: 'Processing results', description: 'Deduplicating and validating emails' },
  { step: 4, title: 'AI analysis', description: 'Extracting business info with AI' },
  { step: 5, title: 'Finalizing', description: 'Saving results' },
];

export default function WebsitesPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);

  const fetchWebsites = useCallback(async () => {
    try {
      const res = await fetch('/api/websites');
      const data = await res.json();
      setWebsites(data.map((w: any) => ({
        ...w,
        services: typeof w.services === 'string' ? JSON.parse(w.services) : w.services,
        scrapeProgress: typeof w.scrape_progress === 'string' ? JSON.parse(w.scrape_progress) : w.scrape_progress || {},
      })));
    } catch {}
  }, []);

  useEffect(() => { fetchWebsites(); }, [fetchWebsites]);

  useEffect(() => {
    if (websites.some(w => w.scrapeStatus === 'scraping')) {
      const interval = setInterval(fetchWebsites, 3000);
      return () => clearInterval(interval);
    }
  }, [websites, fetchWebsites]);

  const [page, setPage] = useState(0);
  const [viewWebsite, setViewWebsite] = useState<Website | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');

  // Explore state
  const [showExplore, setShowExplore] = useState(false);
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreLimit, setExploreLimit] = useState(10);
  const [exploreRegion, setExploreRegion] = useState('us-en');
  const [exploring, setExploring] = useState(false);
  const [exploreSteps, setExploreSteps] = useState<any[]>([]);
  const [exploreResults, setExploreResults] = useState<any[]>([]);
  const [exploreError, setExploreError] = useState('');
  const [addingWebsites, setAddingWebsites] = useState<Map<string, {status: string; websiteId?: string}>>(new Map());

  const handleAddExploreResult = async (result: any) => {
    if (addingWebsites.has(result.url) && addingWebsites.get(result.url)!.status !== 'error') return;
    const id = String(Date.now());
    setAddingWebsites(prev => new Map(prev).set(result.url, {status: 'adding', websiteId: id}));

    const domain = result.url.replace(/https?:\/\//, "").split("/")[0].split("?")[0];
    const name = result.title || domain.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + domain.slice(1);

    await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, url: result.url, name, scrapeStatus: 'scraping' }),
    });

    setAddingWebsites(prev => new Map(prev).set(result.url, {status: 'crawling', websiteId: id}));
    fetchWebsites();

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url, websiteId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        const emailsStr = data.emails?.join(', ') || '';
        const wsName = data.name || name;
        await fetch('/api/websites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, scrapeStatus: 'done', emails: emailsStr, name: wsName, description: data.description || data.summary || '', summary: data.summary, services: data.services }),
        });
        if (emailsStr) {
          await fetch('/api/email-lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${wsName} - Leads`, emails: emailsStr, source: result.url }),
          });
        }
      } else {
        await fetch('/api/websites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scrapeStatus: 'error' }) });
      }
    } catch {
      await fetch('/api/websites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scrapeStatus: 'error' }) });
    }
    setAddingWebsites(prev => new Map(prev).set(result.url, {status: 'done', websiteId: id}));
    fetchWebsites();
  };

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

    await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, url: addUrl, name: suggName, scrapeStatus: 'scraping' }),
    });

    setShowAdd(false);
    setAddUrl('');
    fetchWebsites();

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl, websiteId: id }),
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

  const handleExplore = async () => {
    if (!exploreQuery.trim()) return;
    setExploring(true);
    setExploreSteps([]);
    setExploreResults([]);
    setExploreError('');
    setExploreResults([]);

    try {
      const existingUrls = websites.filter(w => w.url).map(w => w.url);
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: exploreQuery, maxResults: exploreLimit, existingUrls, region: exploreRegion }),
      });

      const reader = res.body?.getReader();
      if (!reader) { setExploreError('No response stream'); setExploring(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line: string) => {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7).trim();
          return eventType;
        }
        if (line.startsWith('data: ')) {
          try {
            return JSON.parse(line.slice(6));
          } catch {}
        }
        return null;
      };

      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = processLine(line);
            if (!data) continue;

            switch (currentEvent) {
              case 'reasoning':
                setExploreSteps(prev => {
                  const exists = prev.some(s => s.label === data.label && s.description === data.description);
                  if (!exists) return [...prev, { type: 'reasoning', ...data, status: 'active' }];
                  return prev.map(s => s.label === data.label ? { ...s, status: 'active' } : s);
                });
                break;
              case 'reasoning_done':
                setExploreSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));
                break;
              case 'search':
                setExploreSteps(prev => [...prev, { type: 'search', ...data, status: 'active' }]);
                break;
              case 'search_result':
                setExploreSteps(prev => prev.map(s => s.type === 'search' ? { ...s, status: 'complete', data: { resultsCount: data.results?.length } } : s));
                break;
              case 'result':
                setExploreResults(data.results || []);
                setExploreSteps(prev => [...prev, { type: 'result', label: 'Explore complete', description: data.summary || `Found ${data.results?.length || 0} results`, status: 'complete' }]);
                break;
              case 'error':
                setExploreError(data.message);
                break;
            }
          }
        }
      }
    } catch {
      setExploreError('Explore request failed');
    }
    setExploring(false);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Websites</h1>
        <div className="flex items-center gap-2">
          <Can page="websites" action="create"><Button size="sm" variant="secondary" onClick={() => setShowExplore(true)}>
            <Search className="size-3.5" /> Explore
          </Button></Can>
          <Can page="websites" action="create"><Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-3.5" /> Add Website
          </Button></Can>
        </div>
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
                      { label: 'View', onClick: () => setViewWebsite(w) },
                      { label: 'Delete', onClick: () => handleDelete(w.id), className: 'text-red-500', permission: { page: 'websites', action: 'delete' } },
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

      {/* Explore Dialog */}
      <Dialog open={showExplore} onOpenChange={(o) => { if (!o) { setShowExplore(false); setExploreSteps([]); setExploreResults([]); setExploreError(''); setAddingWebsites(new Map()); } }}>
        <DialogContent className="sm:max-w-2xl !max-w-[95vw] w-full max-h-[90vh] overflow-y-auto [&>div]:overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#111827] flex items-center gap-2">
              <Globe className="size-4" /> Explore Websites
            </DialogTitle>
            <DialogDescription className="text-[12px] text-gray-500">
              Describe what kind of websites you're looking for. AI will search and filter results.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Describe what to find</label>
              <Textarea
                value={exploreQuery}
                onChange={e => setExploreQuery(e.target.value)}
                placeholder="e.g. medical clinics in Florida that offer weight loss programs"
                rows={3}
                disabled={exploring}
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="w-24">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Results</label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={exploreLimit}
                  onChange={e => setExploreLimit(Number(e.target.value))}
                  disabled={exploring}
                />
              </div>
              <div className="w-40">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Country</label>
                <select
                  value={exploreRegion}
                  onChange={e => setExploreRegion(e.target.value)}
                  disabled={exploring}
                  className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value="us-en">United States</option>
                  <option value="uk-en">United Kingdom</option>
                  <option value="au-en">Australia</option>
                  <option value="ca-en">Canada</option>
                  <option value="de-de">Germany</option>
                  <option value="fr-fr">France</option>
                  <option value="es-es">Spain</option>
                  <option value="it-it">Italy</option>
                  <option value="nl-nl">Netherlands</option>
                  <option value="br-pt">Brazil</option>
                  <option value="jp-jp">Japan</option>
                  <option value="in-en">India</option>
                  <option value="se-sv">Sweden</option>
                  <option value="no-no">Norway</option>
                  <option value="dk-da">Denmark</option>
                  <option value="fi-fi">Finland</option>
                  <option value="pl-pl">Poland</option>
                  <option value="pt-pt">Portugal</option>
                  <option value="ru-ru">Russia</option>
                  <option value="za-en">South Africa</option>
                </select>
              </div>
              <div>
                <Button onClick={handleExplore} disabled={!exploreQuery.trim() || exploring}>
                  {exploring ? <Loader className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                  {exploring ? 'Exploring...' : 'Start Explore'}
                </Button>
              </div>
            </div>

            {/* Error */}
            {exploreError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{exploreError}</div>
            )}

            {/* Live reasoning while exploring */}
            {exploring && (
              <Reasoning className="w-full" isStreaming>
                <ReasoningTrigger getThinkingMessage={(streaming, duration) =>
                  streaming ? `Thinking${duration ? ` (${duration}s)` : ''}...` : 'Reasoning complete'
                } />
                <ReasoningContent>
                  {exploreSteps.filter(s => s.type === 'reasoning').map((s, i) => (
                    <div key={i} className="mb-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-800">{s.label}:</span> {s.description}
                    </div>
                  ))}
                </ReasoningContent>
              </Reasoning>
            )}

            {/* Chain of Thought */}
            {exploreSteps.length > 0 && (
              <ChainOfThought className="w-full" defaultOpen>
                <ChainOfThoughtHeader>Chain of Thought</ChainOfThoughtHeader>
                <ChainOfThoughtContent>
                  <div className="space-y-2 px-1 py-1">
                    {exploreSteps.map((step, i) => (
                      <ChainOfThoughtStep
                        key={i}
                        label={step.label}
                        description={step.description}
                        icon={step.type === 'search' ? Search : undefined}
                        status={step.status === 'active' ? 'active' : 'complete'}
                      />
                    ))}
                  </div>
                </ChainOfThoughtContent>
              </ChainOfThought>
            )}

            {/* Static reasoning after done */}
            {!exploring && exploreSteps.length > 0 && (
              <Reasoning className="w-full" defaultOpen={false}>
                <ReasoningTrigger />
                <ReasoningContent>
                  {exploreSteps.filter(s => s.type === 'reasoning').map((s, i) => (
                    <div key={i} className="mb-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-800">{s.label}:</span> {s.description}
                    </div>
                  ))}
                </ReasoningContent>
              </Reasoning>
            )}

            {/* Results */}
            {exploreResults.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-800">
                  Found {exploreResults.length} matching {exploreResults.length === 1 ? 'website' : 'websites'}
                </h3>
                <div className="space-y-2">
                  {exploreResults.map((r, i) => {
                    const addState = addingWebsites.get(r.url);
                    return (
                      <div key={i} className="p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block">
                              {r.title}
                            </a>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{r.url}</p>
                            {r.abstract && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">{r.abstract}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!addState ? (
                              <Button size="sm" variant="secondary" onClick={() => handleAddExploreResult(r)}>
                                <Plus className="size-3" /> Add
                              </Button>
                            ) : addState.status === 'adding' ? (
                              <span className="text-[11px] font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1 shrink-0">
                                <Loader className="size-3 animate-spin" /> Adding...
                              </span>
                            ) : addState.status === 'crawling' ? (
                              <span className="text-[11px] font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1 shrink-0 animate-pulse">
                                <Loader className="size-3 animate-spin" /> Crawling...
                              </span>
                            ) : addState.status === 'done' ? (
                              <span className="text-[11px] font-medium px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 shrink-0">Added</span>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => handleAddExploreResult(r)}>
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No results */}
            {!exploring && exploreSteps.length > 0 && exploreResults.length === 0 && !exploreError && (
              <div className="text-sm text-gray-500 text-center py-8">
                No matching websites found. Try a different search query.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">
              {viewWebsite?.scrapeStatus === 'scraping' ? 'Crawl Progress' : 'Website Details'}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">
              {viewWebsite?.scrapeStatus === 'scraping' ? 'Live status of the website crawl' : 'View client research information'}
            </SheetDescription>
          </SheetHeader>
          {viewWebsite && (
            <div className="px-4 space-y-4 text-[13px]">
              {viewWebsite.scrapeStatus === 'scraping' ? (
                <div className="space-y-3 pt-2">
                  <div className="text-sm text-gray-500 mb-4 truncate">{viewWebsite.url.replace(/^https?:\/\//, '')}</div>
                  {SCRAPE_STEPS.map((s) => {
                    const prog = viewWebsite.scrapeProgress as any;
                    const currentStep = prog?.currentStep || 0;
                    const isDone = s.step < currentStep || (s.step === currentStep && prog?.status === 'done');
                    const isRunning = s.step === currentStep && prog?.status === 'running';

                    return (
                      <div key={s.step} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {isDone ? (
                            <div className="size-5 rounded-full bg-green-100 flex items-center justify-center">
                              <Check className="size-3 text-green-600" />
                            </div>
                          ) : isRunning ? (
                            <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center">
                              <Loader className="size-3 text-blue-600 animate-spin" />
                            </div>
                          ) : (
                            <div className="size-5 rounded-full border-2 border-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isDone ? 'text-green-700' : isRunning ? 'text-blue-700' : 'text-gray-400'}`}>
                              {s.title}
                            </span>
                            {isRunning && <span className="text-[11px] text-blue-500 animate-pulse">Running now...</span>}
                            {isDone && <span className="text-[11px] text-green-500">Done</span>}
                          </div>
                          <p className={`text-xs mt-0.5 ${isDone || isRunning ? 'text-gray-500' : 'text-gray-300'}`}>
                            {isRunning && prog?.message ? prog.message : s.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
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
                </>
              )}
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
