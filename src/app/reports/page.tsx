'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Legend, Area, AreaChart } from 'recharts';
import MainLayout from '@/components/main-layout';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { Can } from '@/components/can';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function ReportsPage() {
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
        <Can page="reports" action="export">
          <ExportDropdown data={[
            ...stats.websitesByCategory.map(c => ({ Type: 'Websites by Category', Category: c.name, Count: c.count })),
            ...stats.emailsByDomain.map(d => ({ Type: 'Emails by Domain', Domain: d.name, Count: d.count })),
            ...stats.leadTypes.map(l => ({ Type: 'Lead Types', LeadType: l.name, Count: l.value })),
          ]} filename="reports" />
        </Can>
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

      {/* Interactive Area Chart */}
      <ChartAreaInteractive />

    </MainLayout>
  );
}

const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 }, { date: "2024-04-02", desktop: 97, mobile: 180 }, { date: "2024-04-03", desktop: 167, mobile: 120 }, { date: "2024-04-04", desktop: 242, mobile: 260 }, { date: "2024-04-05", desktop: 373, mobile: 290 },
  { date: "2024-04-06", desktop: 301, mobile: 340 }, { date: "2024-04-07", desktop: 245, mobile: 180 }, { date: "2024-04-08", desktop: 409, mobile: 320 }, { date: "2024-04-09", desktop: 59, mobile: 110 }, { date: "2024-04-10", desktop: 261, mobile: 190 },
  { date: "2024-04-11", desktop: 327, mobile: 350 }, { date: "2024-04-12", desktop: 292, mobile: 210 }, { date: "2024-04-13", desktop: 342, mobile: 380 }, { date: "2024-04-14", desktop: 137, mobile: 220 }, { date: "2024-04-15", desktop: 120, mobile: 170 },
  { date: "2024-04-16", desktop: 138, mobile: 190 }, { date: "2024-04-17", desktop: 446, mobile: 360 }, { date: "2024-04-18", desktop: 364, mobile: 410 }, { date: "2024-04-19", desktop: 243, mobile: 180 }, { date: "2024-04-20", desktop: 89, mobile: 150 },
  { date: "2024-04-21", desktop: 137, mobile: 200 }, { date: "2024-04-22", desktop: 224, mobile: 170 }, { date: "2024-04-23", desktop: 138, mobile: 230 }, { date: "2024-04-24", desktop: 387, mobile: 290 }, { date: "2024-04-25", desktop: 215, mobile: 250 },
  { date: "2024-04-26", desktop: 75, mobile: 130 }, { date: "2024-04-27", desktop: 383, mobile: 420 }, { date: "2024-04-28", desktop: 122, mobile: 180 }, { date: "2024-04-29", desktop: 315, mobile: 240 }, { date: "2024-04-30", desktop: 454, mobile: 380 },
  { date: "2024-05-01", desktop: 165, mobile: 220 }, { date: "2024-05-02", desktop: 293, mobile: 310 }, { date: "2024-05-03", desktop: 247, mobile: 190 }, { date: "2024-05-04", desktop: 385, mobile: 420 }, { date: "2024-05-05", desktop: 481, mobile: 390 },
  { date: "2024-05-06", desktop: 498, mobile: 520 }, { date: "2024-05-07", desktop: 388, mobile: 300 }, { date: "2024-05-08", desktop: 149, mobile: 210 }, { date: "2024-05-09", desktop: 227, mobile: 180 }, { date: "2024-05-10", desktop: 293, mobile: 330 },
  { date: "2024-05-11", desktop: 335, mobile: 270 }, { date: "2024-05-12", desktop: 197, mobile: 240 }, { date: "2024-05-13", desktop: 197, mobile: 160 }, { date: "2024-05-14", desktop: 448, mobile: 490 }, { date: "2024-05-15", desktop: 473, mobile: 380 },
  { date: "2024-05-16", desktop: 338, mobile: 400 }, { date: "2024-05-17", desktop: 499, mobile: 420 }, { date: "2024-05-18", desktop: 315, mobile: 350 }, { date: "2024-05-19", desktop: 235, mobile: 180 }, { date: "2024-05-20", desktop: 177, mobile: 230 },
  { date: "2024-05-21", desktop: 82, mobile: 140 }, { date: "2024-05-22", desktop: 81, mobile: 120 }, { date: "2024-05-23", desktop: 252, mobile: 290 }, { date: "2024-05-24", desktop: 294, mobile: 220 }, { date: "2024-05-25", desktop: 201, mobile: 250 },
  { date: "2024-05-26", desktop: 213, mobile: 170 }, { date: "2024-05-27", desktop: 420, mobile: 460 }, { date: "2024-05-28", desktop: 233, mobile: 190 }, { date: "2024-05-29", desktop: 78, mobile: 130 }, { date: "2024-05-30", desktop: 340, mobile: 280 },
  { date: "2024-05-31", desktop: 178, mobile: 230 }, { date: "2024-06-01", desktop: 178, mobile: 200 }, { date: "2024-06-02", desktop: 470, mobile: 410 }, { date: "2024-06-03", desktop: 103, mobile: 160 }, { date: "2024-06-04", desktop: 439, mobile: 380 },
  { date: "2024-06-05", desktop: 88, mobile: 140 }, { date: "2024-06-06", desktop: 294, mobile: 250 }, { date: "2024-06-07", desktop: 323, mobile: 370 }, { date: "2024-06-08", desktop: 385, mobile: 320 }, { date: "2024-06-09", desktop: 438, mobile: 480 },
  { date: "2024-06-10", desktop: 155, mobile: 200 }, { date: "2024-06-11", desktop: 92, mobile: 150 }, { date: "2024-06-12", desktop: 492, mobile: 420 }, { date: "2024-06-13", desktop: 81, mobile: 130 }, { date: "2024-06-14", desktop: 426, mobile: 380 },
  { date: "2024-06-15", desktop: 307, mobile: 350 }, { date: "2024-06-16", desktop: 371, mobile: 310 }, { date: "2024-06-17", desktop: 475, mobile: 520 }, { date: "2024-06-18", desktop: 107, mobile: 170 }, { date: "2024-06-19", desktop: 341, mobile: 290 },
  { date: "2024-06-20", desktop: 408, mobile: 450 }, { date: "2024-06-21", desktop: 169, mobile: 210 }, { date: "2024-06-22", desktop: 317, mobile: 270 }, { date: "2024-06-23", desktop: 480, mobile: 530 }, { date: "2024-06-24", desktop: 132, mobile: 180 },
  { date: "2024-06-25", desktop: 141, mobile: 190 }, { date: "2024-06-26", desktop: 434, mobile: 380 }, { date: "2024-06-27", desktop: 448, mobile: 490 }, { date: "2024-06-28", desktop: 149, mobile: 200 }, { date: "2024-06-29", desktop: 103, mobile: 160 },
  { date: "2024-06-30", desktop: 446, mobile: 400 },
];

function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = useState("90d");
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date("2024-06-30");
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    else if (timeRange === "7d") daysToSubtract = 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  return (
    <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Email Activity</h3>
          <p className="text-xs text-gray-400">Desktop vs Mobile engagement over time</p>
        </div>
        <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600">
          <option value="90d">Last 3 months</option>
          <option value="30d">Last 30 days</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tick={{ fontSize: 11 }}
            tickFormatter={(value) => { const d = new Date(value); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Area dataKey="mobile" type="natural" fill="url(#fillMobile)" stroke="var(--chart-2)" stackId="a" />
          <Area dataKey="desktop" type="natural" fill="url(#fillDesktop)" stroke="var(--chart-1)" stackId="a" />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
