'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';

const PAGE_SIZE = 15;

export default function SendingHistoryPage() {
  const [sends] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(sends.length / PAGE_SIZE);
  const paged = sends.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Sending History</h1>
        <span className="text-xs text-gray-400">{sends.length} total</span>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Campaign</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Recipients</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Sent</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Bounced</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Date</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No campaigns sent yet.</td></tr>
            ) : (
              paged.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{s.campaign}</td>
                  <td className="py-3 px-5 text-gray-500">{s.recipients}</td>
                  <td className="py-3 px-5 text-gray-500">{s.sent}</td>
                  <td className="py-3 px-5 text-gray-500">{s.bounced}</td>
                  <td className="py-3 px-5 text-gray-500">{s.date}</td>
                  <td className="py-3 px-5">
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">{s.status}</span>
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
    </MainLayout>
  );
}
