'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';

type BounceEntry = {
  id: string; email: string; type: string; reason: string;
  confidence: number; received: string; status: string;
};

const PAGE_SIZE = 15;

export default function BounceMonitorPage() {
  const [responses, setResponses] = useState<BounceEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'bounce' | 'auto-reply'>('all');
  const [page, setPage] = useState(0);

  useEffect(() => { fetch('/api/bounce-responses').then(r => r.json()).then(setResponses); }, []);

  const filtered = filter === 'all' ? responses : responses.filter(r => r.type === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Bounce & Response Monitor</h1>
        <span className="text-xs text-gray-400">{responses.length} total</span>
      </div>
      <div className="flex gap-2 mb-6">
        {(['all', 'bounce', 'auto-reply'] as const).map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(0); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors ${
               filter === f ? 'bg-primary text-primary-foreground' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f === 'bounce' ? 'Bounces' : 'Auto-Replies'}
          </button>
        ))}
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Email</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Type</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Reason</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Confidence</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Received</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No responses captured yet. Inbound monitoring not active.</td></tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{r.email}</td>
                  <td className="py-3 px-5"><span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${r.type === 'bounce' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{r.type}</span></td>
                  <td className="py-3 px-5 text-gray-500">{r.reason}</td>
                  <td className="py-3 px-5 text-gray-500">{r.confidence}%</td>
                  <td className="py-3 px-5 text-gray-500">{new Date(r.received).toLocaleDateString()}</td>
                  <td className="py-3 px-5"><span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-yellow-50 text-yellow-700 border-yellow-200">{r.status}</span></td>
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
    </MainLayout>
  );
}
