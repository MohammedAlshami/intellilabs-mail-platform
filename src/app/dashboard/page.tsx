'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { ExportDialog } from '@/components/shared/export-dialog';

export default function DashboardPage() {
  const [stats, setStats] = useState({ websites: 0, emails: 0, flagged: 0, campaigns: 0, websitesByCategory: [] as { name: string; count: number }[] });
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    fetch('/api/websites').then(r => r.json()).then(rows => {
      const cats: Record<string, number> = {};
      let totalEmails = 0;
      for (const w of rows) {
        cats[w.category || 'Uncategorized'] = (cats[w.category || 'Uncategorized'] || 0) + 1;
        if (w.emails) totalEmails += w.emails.split(',').length;
      }
      setStats({ websites: rows.length, emails: totalEmails, flagged: 0, campaigns: 0, websitesByCategory: Object.entries(cats).map(([name, count]) => ({ name, count })) });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Websites Scanned', value: stats.websites },
    { label: 'Leads Extracted', value: stats.emails },
    { label: 'Campaigns Sent', value: stats.campaigns },
    { label: 'Flagged for Removal', value: stats.flagged },
  ];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Dashboard</h1>
        <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111827] hover:bg-black text-white font-semibold rounded-[6px] transition-colors shadow-sm">
          <Download className="size-3.5" /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">{card.label}</span>
            <span className="text-[32px] font-semibold text-[#111827] mt-2 block">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Websites by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.websitesByCategory}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6">
        <h2 className="text-[16px] font-medium text-gray-700 mb-4">Recent Activity</h2>
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-6 text-[13px] text-gray-400 text-center">
          Activity log will appear here once campaigns and email operations begin.
        </div>
      </div>

      <ExportDialog open={showExport} onOpenChange={setShowExport} data={[{ type: 'Dashboard Summary', websites: stats.websites, leads: stats.emails, campaigns: stats.campaigns, flagged: stats.flagged }]} filename="dashboard" />
    </MainLayout>
  );
}
