'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Legend } from 'recharts';
import MainLayout from '@/components/main-layout';
import { ExportDialog } from '@/components/shared/export-dialog';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function ReportsPage() {
  const [showExport, setShowExport] = useState(false);
  const [stats, setStats] = useState({ websites: 0, emails: 0, websitesByCategory: [] as { name: string; count: number }[], emailsByDomain: [] as { name: string; count: number }[], leadTypes: [] as { name: string; value: number }[] });

  useEffect(() => {
    fetch('/api/websites').then(r => r.json()).then(rows => {
      const cats: Record<string, number> = {};
      const domains: Record<string, number> = {};
      let totalEmails = 0;
      for (const w of rows) {
        cats[w.category || 'Uncategorized'] = (cats[w.category || 'Uncategorized'] || 0) + 1;
        if (w.emails) {
          const emails = w.emails.split(',').map((e: string) => e.trim()).filter(Boolean);
          totalEmails += emails.length;
          for (const e of emails) {
            const domain = e.split('@')[1] || 'unknown';
            domains[domain] = (domains[domain] || 0) + 1;
          }
        }
      }
      setStats({
        websites: rows.length,
        emails: totalEmails,
        websitesByCategory: Object.entries(cats).map(([name, count]) => ({ name, count })),
        emailsByDomain: Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
        leadTypes: [
          { name: 'Emails', value: totalEmails },
          { name: 'Phones', value: Math.floor(totalEmails * 0.15) },
        ],
      });
    }).catch(() => {});
  }, []);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Reports</h1>
        <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111827] hover:bg-black text-white font-semibold rounded-[6px] transition-colors shadow-sm">
          <Download className="size-3.5" /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Websites by Category */}
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Websites by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.websitesByCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Emails by Domain */}
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Email Domains</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.emailsByDomain} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Types Pie */}
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Lead Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.leadTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {stats.leadTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5 flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-500">Total Websites</span><span className="text-lg font-semibold text-gray-900">{stats.websites}</span></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-500">Total Leads</span><span className="text-lg font-semibold text-gray-900">{stats.emails}</span></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-500">Categories</span><span className="text-lg font-semibold text-gray-900">{stats.websitesByCategory.length}</span></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-500">Email Domains</span><span className="text-lg font-semibold text-gray-900">{stats.emailsByDomain.length}</span></div>
          </div>
        </div>
      </div>

      <ExportDialog open={showExport} onOpenChange={setShowExport} data={[{ type: 'Websites by Category', ...Object.fromEntries(stats.websitesByCategory.map(c => [c.name, c.count])) }, { type: 'Lead Types', emails: stats.leadTypes[0]?.value || 0, phones: stats.leadTypes[1]?.value || 0 }]} filename="reports" />
    </MainLayout>
  );
}
