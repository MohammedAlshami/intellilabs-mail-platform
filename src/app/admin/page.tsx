'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    websites: 0,
    emails: 0,
    campaigns: 0,
    flagged: 0,
    leads: 0,
  });

  useEffect(() => {
    fetch('/api/websites')
      .then(r => r.json())
      .then(rows => {
        let totalEmails = 0;
        for (const w of rows) {
          if (w.emails) totalEmails += w.emails.split(',').length;
        }
        setStats({ websites: rows.length, emails: totalEmails, campaigns: 0, flagged: 0, leads: totalEmails });
      })
      .catch(() => {});
  }, []);

  const cards = [
    { label: 'Websites Scanned', value: stats.websites, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Leads Extracted', value: stats.leads, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Campaigns Sent', value: stats.campaigns, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { label: 'Flagged for Removal', value: stats.flagged, color: 'bg-red-50 text-red-600 border-red-200' },
  ];

  return (
    <>
      <h1 className="text-[22px] font-normal text-gray-900 tracking-tight mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-5">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">{card.label}</span>
            <span className="text-[32px] font-semibold text-[#111827] mt-2 block">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-[16px] font-medium text-gray-700 mb-4">Recent Activity</h2>
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-6 text-[13px] text-gray-400 text-center">
          Activity log will appear here once campaigns and email operations begin.
        </div>
      </div>
    </>
  );
}
