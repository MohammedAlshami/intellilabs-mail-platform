'use client';

import { useState, useEffect } from 'react';
import { Eye, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';

type EmailItem = {
  id: string;
  name: string;
  email: string;
  subject: string;
  text: string;
  date: string;
  read: boolean;
  labels: string[];
  hasAttachments?: boolean;
};

const PAGE_SIZE = 15;

function EmailListContent() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [page, setPage] = useState(0);
  const [viewEmail, setViewEmail] = useState<EmailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mails')
      .then(r => r.json())
      .then(data => {
        if (data.mails) setEmails(data.mails);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(emails.length / PAGE_SIZE);
  const paged = emails.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Emails</h1>
        <span className="text-xs text-gray-400">{emails.length} total</span>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">From</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Subject</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Date</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Labels</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading emails...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No emails found.</td></tr>
            ) : (
              paged.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">{e.name}</span>
                      {e.hasAttachments && <Paperclip className="size-3 text-gray-300" />}
                    </div>
                    <span className="text-gray-400 block">{e.email}</span>
                  </td>
                  <td className="py-3 px-5 text-gray-500 max-w-[250px] truncate">{e.subject}</td>
                  <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1">
                      {e.labels?.slice(0, 2).map((l) => (
                        <span key={l} className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]">
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => {
                        setViewEmail(e);
                        fetch(`/api/mails/${e.id}`)
                          .then(r => r.json())
                          .then(data => {
                            if (!data.error) setViewEmail(prev => prev && prev.id === e.id ? { ...prev, text: data.text, labels: data.labels } : prev);
                          })
                          .catch(() => {});
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
                    >
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

      <Sheet open={!!viewEmail} onOpenChange={(o) => { if (!o) setViewEmail(null); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Email Detail</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">View email content</SheetDescription>
          </SheetHeader>
          {viewEmail && (
            <div className="px-4 space-y-4 text-[13px]">
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">From</span><span className="text-gray-700">{viewEmail.name} ({viewEmail.email})</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Subject</span><span className="text-gray-700 font-medium">{viewEmail.subject}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Date</span><span className="text-gray-700">{new Date(viewEmail.date).toLocaleString()}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Labels</span><div className="flex gap-1 mt-1">{viewEmail.labels?.map(l => (
                <span key={l} className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]">{l}</span>
              ))}</div></div>
              <div className="border-t pt-4">
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-2">Body</span>
                <div className="text-gray-700 whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-gray-50 rounded p-3 text-[12px] leading-relaxed">
                  {viewEmail.text || 'No text content'}
                </div>
              </div>
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function EmailsPage() {
  return (
    <MainLayout>
      <EmailListContent />
    </MainLayout>
  );
}

function formatDate(date: string): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return date;
  }
}
