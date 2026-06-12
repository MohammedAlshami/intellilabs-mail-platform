"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import MainLayout from "@/components/main-layout";
import { RowActions } from "@/components/row-actions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type User = { id: string; email: string; name: string; roleId: string; signatureId: string; createdAt: string; };
type Role = { id: string; name: string; };
type Signature = { id: string; name: string; isDefault: boolean; };

const PAGE_SIZE = 15;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", roleId: "", signatureId: "" });

  const fetchUsers = () => { fetch("/api/users").then(r => r.json()).then(setUsers); };
  const fetchRoles = () => { fetch("/api/roles").then(r => r.json()).then(setRoles); };
  const fetchSignatures = () => { fetch("/api/email-signatures").then(r => r.json()).then(setSignatures); };
  useEffect(() => { fetchUsers(); fetchRoles(); fetchSignatures(); }, []);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paged = users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const resetForm = () => setForm({ email: "", password: "", name: "", roleId: "", signatureId: "" });

  const handleSave = async () => {
    if (editUser) {
      const body: any = { id: editUser.id, name: form.name, email: form.email, roleId: form.roleId, signatureId: form.signatureId };
      if (form.password) body.password = form.password;
      await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      if (!form.email || !form.password) return;
      await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    fetchUsers();
    setShowAdd(false);
    setEditUser(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchUsers();
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ email: user.email, password: "", name: user.name, roleId: user.roleId, signatureId: user.signatureId || "" });
    setShowAdd(true);
  };

  const getSignatureName = (sigId: string) => {
    const sig = signatures.find(s => s.id === sigId);
    return sig ? sig.name + (sig.isDefault ? " (Default)" : "") : "—";
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Users</h1>
        <Button size="sm" onClick={() => { setEditUser(null); resetForm(); setShowAdd(true); }}><Plus className="size-3.5" /> Add User</Button>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b border-gray-100 bg-[#fafafa]">
            <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
            <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Email</th>
            <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Role</th>
            <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Signature</th>
            <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Created</th>
            <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No users yet.</td></tr>
            ) : paged.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="py-3 px-5 text-gray-700 font-medium">{u.name || "-"}</td>
                <td className="py-3 px-5 text-gray-500">{u.email}</td>
                <td className="py-3 px-5">{roles.find(r => r.id === u.roleId)?.name || <span className="text-gray-300">None</span>}</td>
                <td className="py-3 px-5 text-gray-500">{getSignatureName(u.signatureId)}</td>
                <td className="py-3 px-5 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                <td className="py-3 px-5 text-right">
                  <RowActions actions={[
                    { label: "Edit", onClick: () => openEdit(u) },
                    { label: "Delete", onClick: () => handleDelete(u.id), className: "text-red-500" },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={showAdd} onOpenChange={o => { if (!o) { setShowAdd(false); setEditUser(null); resetForm(); } }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader><SheetTitle className="text-[16px] font-semibold text-[#111827]">{editUser ? "Edit User" : "Add User"}</SheetTitle><SheetDescription className="text-[12px] text-gray-500">{editUser ? "Update user information" : "Create a new user"}</SheetDescription></SheetHeader>
          <div className="px-4 space-y-4">
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" /></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" /></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Password {editUser ? "(leave blank to keep)" : ""}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editUser ? "New password" : "Password"} className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" /></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Role</label><select value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"><option value="">No role</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1">Email Signature</label><select value={form.signatureId} onChange={e => setForm({ ...form, signatureId: e.target.value })} className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[5px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"><option value="">Default (no override)</option>{signatures.map(s => <option key={s.id} value={s.id}>{s.name}{s.isDefault ? " (Default)" : ""}</option>)}</select></div>
            <div className="pt-2"><Button onClick={handleSave} disabled={!editUser && (!form.email || !form.password)} className="w-full">{editUser ? "Update User" : "Create User"}</Button></div>
          </div>
          <SheetClose />
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
