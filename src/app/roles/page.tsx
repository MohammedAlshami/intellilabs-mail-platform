'use client';

import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import MainLayout from '@/components/main-layout';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import { ExportDialog } from '@/components/shared/export-dialog';

const ALL_PERMISSIONS = [
  { id: 'view_dashboard', label: 'View Dashboard', category: 'Dashboard' },
  { id: 'view_reports', label: 'View Reports', category: 'Reports' },
  { id: 'view_campaigns', label: 'View Campaigns', category: 'Campaigns' },
  { id: 'manage_campaigns', label: 'Manage Campaigns', category: 'Campaigns' },
  { id: 'send_emails', label: 'Send Emails', category: 'Campaigns' },
  { id: 'view_websites', label: 'View Websites', category: 'Websites' },
  { id: 'manage_websites', label: 'Manage Websites', category: 'Websites' },
  { id: 'view_leads', label: 'View Leads', category: 'Leads' },
  { id: 'manage_leads', label: 'Manage Leads', category: 'Leads' },
  { id: 'view_audit', label: 'View Audit Trail', category: 'Audit' },
  { id: 'manage_removal_list', label: 'Manage Removal List', category: 'Removal' },
  { id: 'export_data', label: 'Export Data', category: 'Data' },
  { id: 'manage_users', label: 'Manage Users', category: 'Admin' },
  { id: 'manage_roles', label: 'Manage Roles', category: 'Admin' },
  { id: 'manage_settings', label: 'Manage Settings', category: 'Admin' },
];

const PAGE_SIZE = 10;

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [viewRole, setViewRole] = useState<any>(null);
  const [editRole, setEditRole] = useState<any>(null);
  const [showExport, setShowExport] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
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
    setFormName(''); setFormDesc(''); setFormPerms([]); setFormIsLeader(false); setFormLeadsRoles([]);
  };

  const togglePerm = (permId: string) => {
    setFormPerms(prev => prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]);
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
    const perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
    setFormPerms(perms || []);
    setFormIsLeader(!!role.isLeader);
    const leads = typeof role.leadsRoles === 'string' ? JSON.parse(role.leadsRoles) : role.leadsRoles;
    setFormLeadsRoles(leads || []);
  };

  const categories = [...new Set(ALL_PERMISSIONS.map(p => p.category))];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Roles & Permissions</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-[6px] transition-colors shadow-sm"><Download className="size-3.5" /> Export</button>
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111827] hover:bg-black text-white font-semibold rounded-[6px] transition-colors shadow-sm"><Plus className="size-3.5" /> Create Role</button>
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
                const perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
                const leads = typeof role.leadsRoles === 'string' ? JSON.parse(role.leadsRoles) : role.leadsRoles;
                return (
                  <tr key={role.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-5 text-gray-700 font-medium">{role.name}</td>
                    <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{role.description || '—'}</td>
                    <td className="py-3 px-5 text-gray-500">{perms?.length || 0} permissions</td>
                    <td className="py-3 px-5">{role.isLeader ? <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-purple-50 text-purple-600 border-purple-200">Leader</span> : '—'}</td>
                    <td className="py-3 px-5 text-gray-500">{leads?.length ? leads.join(', ') : '—'}</td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewRole(role)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"><Eye className="size-3.5" /></button>
                        <button onClick={() => openEdit(role)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"><Edit className="size-3.5" /></button>
                      </div>
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
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader><SheetTitle className="text-[16px] font-semibold text-[#111827]">Role Details</SheetTitle><SheetDescription className="text-[12px] text-gray-500">View role information</SheetDescription></SheetHeader>
          {viewRole && (
            <div className="px-4 space-y-4 text-[13px]">
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Name</span><span className="text-gray-700">{viewRole.name}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Description</span><span className="text-gray-700">{viewRole.description || '—'}</span></div>
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Leader</span><span className="text-gray-700">{viewRole.isLeader ? 'Yes' : 'No'}</span></div>
              {viewRole.isLeader && <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Leads Roles</span><span className="text-gray-700">{(typeof viewRole.leadsRoles === 'string' ? JSON.parse(viewRole.leadsRoles) : viewRole.leadsRoles).join(', ') || 'None'}</span></div>}
              <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Permissions ({ALL_PERMISSIONS.filter(p => (typeof viewRole.permissions === 'string' ? JSON.parse(viewRole.permissions) : viewRole.permissions).includes(p.id)).length})</span>
                <div className="flex flex-wrap gap-1 mt-1">{ALL_PERMISSIONS.filter(p => (typeof viewRole.permissions === 'string' ? JSON.parse(viewRole.permissions) : viewRole.permissions).includes(p.id)).map(p => (
                  <span key={p.id} className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]">{p.label}</span>
                ))}</div>
              </div>
            </div>
          )}
          <SheetClose />
        </SheetContent>
      </Sheet>

      {/* Add/Edit Sheet */}
      <Sheet open={showAdd || !!editRole} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditRole(null); resetForm(); } }}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
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
                      className={`text-[11px] font-medium px-2 py-1 rounded border transition-colors ${formLeadsRoles.includes(r.name) ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >{r.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t pt-4">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-2">Permissions</label>
              {categories.map(cat => (
                <div key={cat} className="mb-3">
                  <div className="text-[12px] font-semibold text-gray-700 mb-1">{cat}</div>
                  <div className="space-y-1">
                    {ALL_PERMISSIONS.filter(p => p.category === cat).map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded border-gray-300 text-[#111827] focus:ring-gray-300" />
                        <span className="text-[13px] text-gray-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <button onClick={editRole ? handleEdit : handleAdd} disabled={!formName} className="w-full py-2 bg-[#111827] hover:bg-black disabled:bg-gray-300 text-white text-[12px] font-semibold rounded-[6px] transition-colors shadow-sm">
                {editRole ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>

      <ExportDialog open={showExport} onOpenChange={setShowExport} data={roles.map(r => ({ ...r, permissions: JSON.stringify(typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions) }))} filename="roles" />
    </MainLayout>
  );
}
