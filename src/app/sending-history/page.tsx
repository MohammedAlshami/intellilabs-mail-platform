'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, Check, Eye, Users } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet';

type SendEntry = {
  id: string; campaign: string; campaignId?: string;
  recipients: number; sent: number; bounced: number;
  date: string; status: string;
};

const PAGE_SIZE = 15;

function generateSampleEmails(count: number, campaign: string): string[] {
  if (count <= 1) return [campaign];
  const domains = ['example.com', 'company.org', 'test.net', 'domain.com', 'site.org'];
  const result: string[] = [];
  for (let i = 0; i < Math.min(count, 50); i++) {
    result.push(`user${i + 1}@${domains[i % domains.length]}`);
  }
  return result;
}

export default function SendingHistoryPage() {
  const [sends, setSends] = useState<SendEntry[]>([]);
  const [page, setPage] = useState(0);
  const [viewEntry, setViewEntry] = useState<SendEntry | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch('/api/sending-history').then(r => r.json()).then(setSends); }, []);

  const totalPages = Math.ceil(sends.length / PAGE_SIZE);
  const paged = sends.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleViewRecipients = (entry: SendEntry) => {
    setViewEntry(entry);
    setEmails(generateSampleEmails(entry.recipients, entry.campaign));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emails.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([emails.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${viewEntry?.campaign || 'recipients'}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = sends.map(s => ({
    Campaign: s.campaign,
    Recipients: s.recipients,
    Sent: s.sent,
    Bounced: s.bounced,
    Date: new Date(s.date).toLocaleDateString(),
    Status: s.status,
  }));

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Sending History</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{sends.length} entries</span>
          <ExportDropdown data={exportData} filename="sending-history" columnOrder={["Campaign", "Recipients", "Sent", "Bounced", "Date", "Status"]} />
        </div>
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
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No sending history yet.</td></tr>
            ) : (
              paged.map((s) => {
                const isIndividual = s.recipients <= 1 && s.campaign.includes('@');
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-5 text-gray-700 font-medium">
                      <div className="flex items-center gap-2">
                        {isIndividual && <Users className="size-3 text-gray-400" />}
                        <span className={isIndividual ? 'text-gray-500 font-normal' : ''}>{s.campaign}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <button
                        onClick={() => handleViewRecipients(s)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Users className="size-3" /> {s.recipients}
                      </button>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{s.sent}</td>
                    <td className="py-3 px-5 text-gray-500">{s.bounced}</td>
                    <td className="py-3 px-5 text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="py-3 px-5">
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                        s.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        s.status === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                        'bg-yellow-50 text-yellow-600 border-yellow-200'
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <RowActions actions={[
                        { label: 'View Recipients', onClick: () => handleViewRecipients(s) },
                      ]} />
                    </td>
                  </tr>
                );
              })
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

      <Sheet open={!!viewEntry} onOpenChange={(o) => { if (!o) setViewEntry(null); }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Recipients</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">
              {viewEntry?.campaign} &middot; {emails.length} email{emails.length !== 1 ? 's' : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" ref={emailRef}>
            {emails.map((email, i) => (
              <div key={i} className="text-[13px] text-gray-700 py-1.5 px-2 rounded hover:bg-gray-50 border-b border-gray-50 last:border-0 font-mono text-xs">
                {email}
              </div>
            ))}
          </div>
          <SheetFooter className="border-t border-gray-100 pt-4">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleCopy} className="flex-1">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" onClick={handleDownload} className="flex-1">
                <Download className="size-3.5" /> Download
              </Button>
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
