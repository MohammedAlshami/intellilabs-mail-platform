'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mail, Phone, ExternalLink } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { Can } from '@/components/can';

type Lead = {
  id: string; websiteId: string; websiteName: string;
  type: "email" | "phone"; value: string; createdAt: string;
};

const PAGE_SIZE = 15;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => { fetch('/api/leads').then(r => r.json()).then(setLeads); }, []);

  const totalPages = Math.ceil(leads.length / PAGE_SIZE);
  const paged = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Leads</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{leads.length} total</span>
          <Can page="leads" action="export"><ExportDropdown data={leads.map(l => ({ Type: l.type, Value: l.value, Source: l.websiteName, Date: new Date(l.createdAt).toLocaleDateString() }))} filename="leads" columnOrder={["Type", "Value", "Source", "Date"]} /></Can>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Type</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Value</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Source</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Date Extracted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No leads yet.</td></tr>
            ) : (
              paged.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${lead.type === 'email' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                      {lead.type === 'email' ? <Mail className="size-3" /> : <Phone className="size-3" />}
                      {lead.type === 'email' ? 'Email' : 'Phone'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-700">{lead.value}</td>
                  <td className="py-3 px-5">
                    <a href={`/websites/${lead.websiteId}`} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      {lead.websiteName}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </td>
                  <td className="py-3 px-5 text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
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
