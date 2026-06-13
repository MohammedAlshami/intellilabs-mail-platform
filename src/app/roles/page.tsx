'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/can';

const ALL_PAGES = [
  "dashboard", "mail", "campaigns", "email-lists", "sending-history",
  "bounce-monitor", "templates", "signatures", "websites", "leads",
  "removal-list", "reports", "audit-trail", "roles", "users", "profile",
] as const;

const ALL_ACTIONS = ["view", "create", "edit", "delete", "export"] as const;

type PagePerms = Record<string, Record<string, boolean>>;

const PAGE_GROUPS: Record<string, string[]> = {
  Overview: ["dashboard", "reports"],
  Email: ["mail", "campaigns", "email-lists", "sending-history", "bounce-monitor", "templates", "signatures"],
  Data: ["websites", "leads", "removal-list"],
  Admin: ["audit-trail", "roles", "users", "profile"],
};

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  mail: "Mail",
  campaigns: "Campaigns",
  "email-lists": "Email Lists",
  "sending-history": "Sending History",
  "bounce-monitor": "Bounce Monitor",
  templates: "Templates",
  signatures: "Signatures",
  websites: "Websites",
  leads: "Leads",
  "removal-list": "Removal List",
  reports: "Reports",
  "audit-trail": "Audit Trail",
  roles: "Roles",
  users: "Users",
  profile: "Profile",
};

const PAGE_SIZE = 10;

function parsePerms(raw: any): PagePerms {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  if (raw && typeof raw === "object") return raw;
  return {};
}

function emptyPerms(): PagePerms {
  const p: PagePerms = {};
  for (const page of ALL_PAGES) {
    p[page] = Object.fromEntries(ALL_ACTIONS.map(a => [a, false]));
  }
  return p;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [viewRole, setViewRole] = useState<any>(null);
  const [editRole, setEditRole] = useState<any>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState<PagePerms>(emptyPerms());
  const [formIsLeader, setFormIsLeader] = useState(false);
  const [formLeadsRoles, setFormLeadsRoles] = useState<string[]>([]);

  const fetchRoles = () => {
    fetch('/api/roles').then(r => r.json()).then(setRoles).catch(() => {});
  };

  useEffect(() => { fetchRoles(); }, []);

  const totalPages = Math.ceil(roles.length / PAGE_SIZE);
  const paged = roles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const otherRoles = roles.filter(r => r.name !== formName);

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormPerms(emptyPerms()); setFormIsLeader(false); setFormLeadsRoles([]);
  };

  const togglePageAction = (page: string, action: string) => {
    setFormPerms(prev => ({
      ...prev,
      [page]: { ...prev[page], [action]: !prev[page]?.[action] },
    }));
  };

  const handleAdd = async () => {
    if (!formName) return;
    await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formName, description: formDesc, permissions: formPerms, isLeader: formIsLeader, leadsRoles: formLeadsRoles }) });
    setShowAdd(false); resetForm(); fetchRoles();
  };

  const handleEdit = async () => {
    if (!editRole || !formName) return;
    await fetch('/api/roles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editRole.id, name: formName, description: formDesc, permissions: formPerms, isLeader: formIsLeader, leadsRoles: formLeadsRoles }) });
    setEditRole(null); resetForm(); fetchRoles();
  };

  const openEdit = (role: any) => {
    setEditRole(role);
    setFormName(role.name);
    setFormDesc(role.description || '');
    setFormPerms(parsePerms(role.permissions));
    setFormIsLeader(!!role.isLeader);
    const leads = typeof role.leadsRoles === 'string' ? JSON.parse(role.leadsRoles) : role.leadsRoles;
    setFormLeadsRoles(leads || []);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Roles & Permissions</h1>
        <div className="flex items-center gap-2">
          <Can page="roles" action="export">
            <ExportDropdown data={roles.map(r => ({ ...r, permissions: JSON.stringify(parsePerms(r.permissions)) }))} filename="roles" />
          </Can>
          <Can page="roles" action="create">
            <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
              <Plus className="size-3.5" /> Create Role
            </Button>
          </Can>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Description</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Permissions</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Leader</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Leads</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No roles created yet.</td></tr>
            ) : (
              paged.map((role) => {
                const perms = parsePerms(role.permissions);
                const leads = typeof role.leadsRoles === 'string' ? JSON.parse(role.leadsRoles) : role.leadsRoles;
                const totalGranted = Object.values(perms).reduce((sum: number, p: any) =>
                  sum + Object.values(p).filter(Boolean).length, 0);
                return (
                  <tr key={role.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-5 text-gray-700 font-medium">{role.name}</td>
                    <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{role.description || '—'}</td>
                    <td className="py-3 px-5 text-gray-500">{totalGranted} permissions</td>
                    <td className="py-3 px-5">{role.isLeader ? <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-purple-50 text-purple-600 border-purple-200">Leader</span> : '—'}</td>
                    <td className="py-3 px-5 text-gray-500">{leads?.length ? leads.join(', ') : '—'}</td>
                    <td className="py-3 px-5 text-right">
                      <RowActions actions={[
                        { label: 'View', onClick: () => setViewRole(role) },
                        { label: 'Edit', onClick: () => openEdit(role), permission: { page: 'roles', action: 'edit' } },
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
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Sheet */}
      <Sheet open={!!viewRole} onOpenChange={(o) => { if (!o) setViewRole(null); }}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle className="text-[16px] font-semibold text-[#111827]">Role Details</SheetTitle><SheetDescription className="text-[12px] text-gray-500">View role information</SheetDescription></SheetHeader>
          {viewRole && (
            <div className="px-4 space-y-4 text-[13px]">
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Name</span><span className="text-gray-700">{viewRole.name}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Description</span><span className="text-gray-700">{viewRole.description || '—'}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Leader</span><span className="text-gray-700">{viewRole.isLeader ? 'Yes' : 'No'}</span></div>
              {viewRole.isLeader && <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Leads Roles</span><span className="text-gray-700">{(typeof viewRole.leadsRoles === 'string' ? JSON.parse(viewRole.leadsRoles) : viewRole.leadsRoles).join(', ') || 'None'}</span></div>}
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider mb-2">Permissions</span>
                {Object.entries(PAGE_GROUPS).map(([group, pages]) => (
                  <div key={group} className="mb-3">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{group}</div>
                    {pages.filter(p => parsePerms(viewRole.permissions)[p] && Object.values(parsePerms(viewRole.permissions)[p]).some(Boolean)).map(page => {
                      const pp = parsePerms(viewRole.permissions)[page] || {};
                      const granted = ALL_ACTIONS.filter(a => pp[a]).join(", ");
                      return (
                        <div key={page} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-700">{PAGE_LABELS[page] || page}</span>
                          <span className="text-[11px] text-gray-400">{granted}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>

      {/* Add/Edit Sheet */}
      <Sheet open={showAdd || !!editRole} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditRole(null); resetForm(); } }}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle className="text-[16px] font-semibold text-[#111827]">{editRole ? 'Edit Role' : 'Create Role'}</SheetTitle><SheetDescription className="text-[12px] text-gray-500">{editRole ? 'Update role permissions' : 'Define a new role with permissions'}</SheetDescription></SheetHeader>
          <div className="px-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Name</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Role name" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Description</label>
              <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="What this role can do" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isLeader" checked={formIsLeader} onChange={e => { setFormIsLeader(e.target.checked); if (!e.target.checked) setFormLeadsRoles([]); }} className="rounded border-gray-300 text-[#111827] focus:ring-gray-300" />
              <label htmlFor="isLeader" className="text-[13px] text-gray-700">Team Leader</label>
            </div>
            {formIsLeader && (
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Leads Roles</label>
                <div className="flex flex-wrap gap-1">
                  {otherRoles.map(r => (
                    <button key={r.id} onClick={() => setFormLeadsRoles(prev => prev.includes(r.name) ? prev.filter(n => n !== r.name) : [...prev, r.name])}
                      className={`text-[11px] font-medium px-2 py-1 rounded border transition-colors ${formLeadsRoles.includes(r.name) ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >{r.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t pt-4">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-3">Page Permissions</label>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-1.5 pr-3 text-left text-gray-400 font-medium uppercase tracking-wider">Page</th>
                      {ALL_ACTIONS.map(a => (
                        <th key={a} className="py-1.5 px-2 text-center text-gray-400 font-medium uppercase tracking-wider">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PAGE_GROUPS).map(([group, pages]) => (
                      <>
                        <tr key={group} className="border-b border-gray-100">
                          <td colSpan={6} className="pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{group}</td>
                        </tr>
                        {pages.map(page => (
                          <tr key={page} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-1.5 pr-3 text-gray-700">{PAGE_LABELS[page] || page}</td>
                            {ALL_ACTIONS.map(a => (
                              <td key={a} className="py-1.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={formPerms[page]?.[a] ?? false}
                                  onChange={() => togglePageAction(page, a)}
                                  className="rounded border-gray-300 text-[#111827] focus:ring-gray-300 cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={editRole ? handleEdit : handleAdd} disabled={!formName} className="w-full">
                {editRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
