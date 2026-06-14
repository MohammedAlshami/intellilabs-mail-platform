'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send, Users, AlertTriangle, CheckCircle, User, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';

type Campaign = {
  id: string; name: string; subject: string; recipients: number;
  sent: number; bounced: number; status: string; createdAt: string;
};

type Recipient = {
  id: string; email: string; status: string; responded: boolean; sentiment: string; responseText: string; sentAt: string;
};
type PaginatedResult = { data: Recipient[]; total: number; page: number; limit: number; totalPages: number; };

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'details' | 'insights' | 'recipients'>('details');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipPage, setRecipPage] = useState(1);
  const [recipTotal, setRecipTotal] = useState(0);
  const [recipPages, setRecipPages] = useState(0);
  const [viewRecipient, setViewRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const recipLimit = 15;

  const fetchRecipients = (p: number) => {
    fetch(`/api/campaigns/${id}/recipients?page=${p}&limit=${recipLimit}`)
      .then(r => r.json())
      .then((data: PaginatedResult) => {
        setRecipients(data.data);
        setRecipTotal(data.total);
        setRecipPages(data.totalPages);
      });
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then(r => r.json()),
    ]).then(([all]) => {
      const found = all.find((c: Campaign) => c.id === id);
      if (found) setCampaign(found);
      fetchRecipients(1);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MainLayout><div className="text-center text-gray-400 py-16">Loading...</div></MainLayout>;
  if (!campaign) return <MainLayout><div className="text-center text-gray-400 py-16">Campaign not found.</div></MainLayout>;

  const responseRate = campaign.sent > 0 ? Math.round((campaign.sent - campaign.bounced) / campaign.sent * 100) : 0;
  const deliveryData = [
    { name: 'Delivered', value: Math.max(0, campaign.sent - campaign.bounced) },
    { name: 'Bounced', value: campaign.bounced },
    { name: 'Pending', value: Math.max(0, campaign.recipients - campaign.sent) },
  ];
  const dailyData = [
    { day: 'Mon', sent: Math.round(campaign.sent * 0.2), bounced: Math.round(campaign.bounced * 0.15) },
    { day: 'Tue', sent: Math.round(campaign.sent * 0.35), bounced: Math.round(campaign.bounced * 0.3) },
    { day: 'Wed', sent: Math.round(campaign.sent * 0.3), bounced: Math.round(campaign.bounced * 0.35) },
    { day: 'Thu', sent: Math.round(campaign.sent * 0.15), bounced: Math.round(campaign.bounced * 0.2) },
    { day: 'Fri', sent: 0, bounced: 0 },
  ];

  return (
    <MainLayout>
      <a href="/campaign" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="size-3.5" /> Back to Campaigns
      </a>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">{campaign.name}</h1>
          <p className="text-xs text-gray-400 mt-1">{campaign.subject}</p>
        </div>
        <span className={`text-[11px] font-medium px-2 py-1 rounded border ${
          campaign.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' :
          campaign.status === 'sending' ? 'bg-blue-50 text-blue-600 border-blue-200' :
          'bg-gray-100 text-gray-500 border-gray-200'
        }`}>{campaign.status}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-2"><Send className="size-3.5" /> Total Sent</div>
          <div className="text-2xl font-semibold text-gray-900">{campaign.sent}</div>
        </div>
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-2"><Users className="size-3.5" /> Recipients</div>
          <div className="text-2xl font-semibold text-gray-900">{campaign.recipients}</div>
        </div>
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-2"><AlertTriangle className="size-3.5" /> Bounced</div>
          <div className="text-2xl font-semibold text-red-500">{campaign.bounced}</div>
        </div>
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-2"><CheckCircle className="size-3.5" /> Response Rate</div>
          <div className="text-2xl font-semibold text-green-500">{responseRate}%</div>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-100 mb-6">
        <button onClick={() => setTab('details')} className={`pb-2 text-sm font-medium transition-colors ${tab === 'details' ? 'text-[#111827] border-b-2 border-[#111827]' : 'text-gray-400 hover:text-gray-600'}`}>Details</button>
        <button onClick={() => setTab('insights')} className={`pb-2 text-sm font-medium transition-colors ${tab === 'insights' ? 'text-[#111827] border-b-2 border-[#111827]' : 'text-gray-400 hover:text-gray-600'}`}>Insights</button>
        <button onClick={() => setTab('recipients')} className={`pb-2 text-sm font-medium transition-colors ${tab === 'recipients' ? 'text-[#111827] border-b-2 border-[#111827]' : 'text-gray-400 hover:text-gray-600'}`}>Recipients ({campaign.recipients})</button>
      </div>

      {tab === 'details' && (
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-6 text-[13px] space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="size-10 rounded-full bg-[#f3f4f6] flex items-center justify-center">
              <User className="size-5 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-700 font-medium">IntelliLabs Mail Platform</p>
              <p className="text-gray-400 text-xs">noreply@intellilabs.com</p>
            </div>
          </div>
          <div className="space-y-4">
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Subject</span><span className="text-gray-700 font-medium">{campaign.subject}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Sent At</span><span className="text-gray-700">{campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : '—'}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Status</span><span className="text-gray-700 capitalize">{campaign.status}</span></div>
          </div>
          <div className="border-t pt-4">
            <span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-2">Email Content</span>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-[12px] leading-relaxed whitespace-pre-wrap">
              {`Hi there,

We're excited to share our latest updates with you.

This is a preview of the email content for "${campaign.name}".

Best regards,
The IntelliLabs Team`}
            </div>
          </div>
        </div>
      )}

      {tab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Delivery Breakdown</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={deliveryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {deliveryData.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Daily Delivery</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#22c55e" radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="bounced" fill="#ef4444" radius={[4, 4, 0, 0]} name="Bounced" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-6 text-[13px]">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Campaign Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Name</span><span className="text-gray-700">{campaign.name}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Subject</span><span className="text-gray-700">{campaign.subject}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Recipients</span><span className="text-gray-700">{campaign.recipients}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Sent</span><span className="text-gray-700">{campaign.sent}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Bounced</span><span className="text-gray-700">{campaign.bounced}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Status</span><span className="text-gray-700 capitalize">{campaign.status}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Created</span><span className="text-gray-700">{campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'recipients' && (
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#fafafa]">
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Email</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Responded</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Sentiment</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Sent At</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {recipients.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No recipient data yet.</td></tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-5 text-gray-700">{r.email}</td>
                    <td className="py-3 px-5">
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                        r.status === 'sent' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        r.status === 'responded' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-3 px-5">{r.responded ? <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">Yes</span> : <span className="text-gray-300">No</span>}</td>
                    <td className="py-3 px-5">
                      {r.sentiment ? (
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                          r.sentiment === 'interested' ? 'bg-green-50 text-green-700 border-green-200' :
                          r.sentiment === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>{r.sentiment}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-5 text-gray-500">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                    <td className="py-3 px-5 text-right">
                      <RowActions actions={[
                        { label: 'View Details', onClick: () => setViewRecipient(r) },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {recipPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
              <span className="text-xs text-gray-500">Page {recipPage} of {recipPages} ({recipTotal} total)</span>
              <div className="flex items-center gap-3">
                <button onClick={() => { const p = Math.max(1, recipPage - 1); setRecipPage(p); fetchRecipients(p); }} disabled={recipPage === 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="size-4" />
                </button>
                <button onClick={() => { const p = Math.min(recipPages, recipPage + 1); setRecipPage(p); fetchRecipients(p); }} disabled={recipPage >= recipPages} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Sheet open={!!viewRecipient} onOpenChange={(o) => { if (!o) setViewRecipient(null); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[16px] font-semibold text-[#111827]">Recipient Details</SheetTitle>
            <SheetDescription className="text-[12px] text-gray-500">Email interaction overview</SheetDescription>
          </SheetHeader>
          {viewRecipient && (
            <div className="px-4 space-y-5 text-[13px]">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="size-10 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                  <User className="size-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">{viewRecipient.email}</p>
                  <p className="text-gray-400 text-xs">Campaign: {campaign.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Status</span><span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                  viewRecipient.status === 'sent' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  viewRecipient.status === 'responded' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-red-50 text-red-600 border-red-200'
                }`}>{viewRecipient.status}</span></div>
                <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Sent At</span><span className="text-gray-700">{viewRecipient.sentAt ? new Date(viewRecipient.sentAt).toLocaleString() : '—'}</span></div>
              </div>

              <div className="border-t pt-4">
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-2">Email Sent to Them</span>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-[12px] leading-relaxed whitespace-pre-wrap">
                  Subject: {campaign.subject}
                  {'\n\n'}Hi there,

We're excited to share our latest updates with you.

This is the email content for "{campaign.name}".

Best regards,
The IntelliLabs Team
                </div>
              </div>

              {viewRecipient.responded && viewRecipient.responseText ? (
                <>
                  <div className="border-t pt-4">
                    <span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-2">Their Response</span>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-gray-700 text-[12px] leading-relaxed italic">
                      "{viewRecipient.responseText}"
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-3">
                      <Sparkles className="size-3.5 text-yellow-500" /> AI Analysis
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-[12px] leading-relaxed">
                      {viewRecipient.sentiment === 'interested' ? (
                        <p>The recipient responded positively and expressed interest. Their message suggests they are a qualified lead. <strong>Recommendation:</strong> Schedule a follow-up call or demo to capitalize on their interest.</p>
                      ) : viewRecipient.sentiment === 'rejected' ? (
                        <p>The recipient declined or unsubscribed. <strong>Recommendation:</strong> Remove from future campaigns to maintain sender reputation and avoid spam complaints.</p>
                      ) : (
                        <p>The recipient responded but the sentiment is neutral — the message may be a routine acknowledgment or auto-reply. <strong>Recommendation:</strong> Monitor for any follow-up before taking action.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : viewRecipient.status === 'bounced' ? (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-3">
                    <Sparkles className="size-3.5 text-yellow-500" /> AI Analysis
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-[12px] leading-relaxed">
                    <p>The email bounced — it was rejected by the recipient's mail server. This could indicate an invalid, inactive, or full mailbox. <strong>Recommendation:</strong> Verify the email address before including in future campaigns.</p>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-gray-400 text-[11px] uppercase tracking-wider mb-3">
                    <Sparkles className="size-3.5 text-yellow-500" /> AI Analysis
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 text-[12px] leading-relaxed">
                    <p>The email was delivered successfully but the recipient has not responded yet. <strong>Recommendation:</strong> If this is a high-value lead, consider sending a follow-up email in 3-5 days.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
