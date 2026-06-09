'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { ExportDialog } from '@/components/shared/export-dialog';

const PAGE_SIZE = 15;

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    fetch('/api/audit-logs').then(r => r.json()).then(setLogs).catch(() => {});
  }, []);

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const paged = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Audit Trail</h1>
        <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111827] hover:bg-black text-white font-semibold rounded-[6px] transition-colors shadow-sm">
          <Download className="size-3.5" /> Export
        </button>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Action</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Entity</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">User</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No audit logs yet.</td></tr>
            ) : (
              paged.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{log.action}</td>
                  <td className="py-3 px-5"><span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]">{log.entityType}</span></td>
                  <td className="py-3 px-5 text-gray-500">{log.userId || '—'}</td>
                  <td className="py-3 px-5 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>
      <ExportDialog open={showExport} onOpenChange={setShowExport} data={logs} filename="audit-trail" />
    </MainLayout>
  );
}
