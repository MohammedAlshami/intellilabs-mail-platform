'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, Mail, Phone, ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import type { Website } from '@/lib/data';

function getLeadsFromWebsite(website: Website) {
  const leads: { id: string; type: 'email' | 'phone'; value: string }[] = [];
  if (website.emails) {
    website.emails.split(',').map(e => e.trim()).filter(Boolean).forEach((e, i) => {
      leads.push({ id: `${website.id}-email-${i}`, type: 'email' as const, value: e });
    });
  }
  if (website.phones) {
    website.phones.split(',').map(p => p.trim()).filter(Boolean).forEach((p, i) => {
      leads.push({ id: `${website.id}-phone-${i}`, type: 'phone' as const, value: p });
    });
  }
  return leads;
}

export default function WebsiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'info' | 'leads'>('info');
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/websites/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        setWebsite({
          ...data,
          services: typeof data.services === 'string' ? JSON.parse(data.services) : data.services,
          isHealthcare: Boolean(data.isHealthcare),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center text-gray-400 py-16">Loading...</div>
      </MainLayout>
    );
  }

  if (!website) {
    return (
      <MainLayout>
        <div className="text-center text-gray-400 py-16">Website not found.</div>
      </MainLayout>
    );
  }

  const leads = getLeadsFromWebsite(website);

  return (
    <MainLayout>
      <a href="/websites" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="size-3.5" /> Back to Websites
      </a>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">{website.name}</h1>
          <a href={website.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1">
            {website.url} <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100 mb-6">
        <button onClick={() => setTab('info')} className={`pb-2 text-sm font-medium transition-colors ${tab === 'info' ? 'text-[#111827] border-b-2 border-[#111827]' : 'text-gray-400 hover:text-gray-600'}`}>
          Info
        </button>
        <button onClick={() => setTab('leads')} className={`pb-2 text-sm font-medium transition-colors ${tab === 'leads' ? 'text-[#111827] border-b-2 border-[#111827]' : 'text-gray-400 hover:text-gray-600'}`}>
          Leads ({leads.length})
        </button>
      </div>

      {tab === 'info' && (
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-6 space-y-5 text-[13px]">
          <div className="grid grid-cols-2 gap-6">
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Name</span><span className="text-gray-700">{website.name}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Category</span><span className="text-gray-700">{website.category}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">URL</span><a href={website.url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 flex items-center gap-1">{website.url} <ExternalLink className="size-3" /></a></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Healthcare</span><span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border inline-block mt-0.5 ${website.isHealthcare ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{website.isHealthcare ? 'Yes' : 'No'}</span></div>
          </div>
          {website.summary && (
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Summary</span><p className="text-gray-700 leading-relaxed">{website.summary}</p></div>
          )}
          {website.description && (
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Description</span><p className="text-gray-700 leading-relaxed">{website.description}</p></div>
          )}
          {website.services && website.services.length > 0 && (
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Services</span><ul className="list-disc list-inside text-gray-700 space-y-1">{website.services.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Extracted Emails</span><span className="text-gray-700">{website.emails || 'None'}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Extracted Phones</span><span className="text-gray-700">{website.phones || 'None'}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-0.5">Added</span><span className="text-gray-700">{new Date(website.createdAt).toLocaleString()}</span></div>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#fafafa]">
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Type</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Value</th>
                <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {leads.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-gray-400">No leads extracted yet.</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${lead.type === 'email' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                        {lead.type === 'email' ? <Mail className="size-3" /> : <Phone className="size-3" />}
                        {lead.type === 'email' ? 'Email' : 'Phone'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-gray-700">{lead.value}</td>
                    <td className="py-3 px-5 text-gray-500">{website.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}
