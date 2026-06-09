'use client';

import { useState } from 'react';
import { Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  recipients: number;
  sent: number;
  bounced: number;
  status: string;
  createdAt: string;
};

const PAGE_SIZE = 10;

export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(0);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSubject, setAddSubject] = useState('');
  const [addRecipients, setAddRecipients] = useState('');

  const totalPages = Math.ceil(campaigns.length / PAGE_SIZE);
  const paged = campaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = () => {
    if (!addName || !addSubject) return;
    const newCampaign: Campaign = {
      id: String(Date.now()),
      name: addName,
      subject: addSubject,
      recipients: parseInt(addRecipients) || 0,
      sent: 0,
      bounced: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    setCampaigns([newCampaign, ...campaigns]);
    setShowAdd(false);
    setAddName('');
    setAddSubject('');
    setAddRecipients('');
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Campaigns</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111827] hover:bg-black text-white font-semibold rounded-[6px] transition-colors shadow-sm"
        >
          <Plus className="size-3.5" /> Add Campaign
        </button>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Subject</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Recipients</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Sent</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Bounced</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No campaigns yet.</td></tr>
            ) : (
              paged.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{c.name}</td>
                  <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{c.subject}</td>
                  <td className="py-3 px-5 text-gray-500">{c.recipients}</td>
                  <td className="py-3 px-5 text-gray-500">{c.sent}</td>
                  <td className="py-3 px-5 text-gray-500">{c.bounced}</td>
                  <td className="py-3 px-5">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                      c.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' :
                      c.status === 'sending' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => setViewCampaign(c)}
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

      {/* Add Campaign Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) setShowAdd(false); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Add Campaign</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Create a new email campaign</SheetDescription>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Name</label>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Campaign name" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Subject</label>
              <input value={addSubject} onChange={e => setAddSubject(e.target.value)} placeholder="Email subject" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Recipients</label>
              <input value={addRecipients} onChange={e => setAddRecipients(e.target.value)} placeholder="Number of recipients" type="number" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="pt-2">
              <button onClick={handleAdd} disabled={!addName || !addSubject} className="w-full py-2 bg-[#111827] hover:bg-black disabled:bg-gray-300 text-white text-[12px] font-semibold rounded-[6px] transition-colors shadow-sm">
                Create Campaign
              </button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>

      {/* View Campaign Sheet */}
      <Sheet open={!!viewCampaign} onOpenChange={(o) => { if (!o) setViewCampaign(null); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Campaign Details</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">View campaign information</SheetDescription>
          </SheetHeader>
          {viewCampaign && (
            <div className="px-4 space-y-4 text-[13px]">
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Name</span><span className="text-gray-700">{viewCampaign.name}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Subject</span><span className="text-gray-700">{viewCampaign.subject}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Recipients</span><span className="text-gray-700">{viewCampaign.recipients}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Sent</span><span className="text-gray-700">{viewCampaign.sent}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Bounced</span><span className="text-gray-700">{viewCampaign.bounced}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Status</span><span className="text-gray-700 capitalize">{viewCampaign.status}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Created</span><span className="text-gray-700">{new Date(viewCampaign.createdAt).toLocaleString()}</span></div>
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
