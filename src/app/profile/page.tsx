"use client";
import { useState, useEffect } from "react";
import { Pencil, User as UserIcon, Mail, Shield, Calendar } from "lucide-react";
import MainLayout from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => { setUser(data); setName(data.name); setEmail(data.email); });
  }, []);

  const handleSave = async () => {
    setMessage("");
    const body: any = { name, email };
    if (newPassword) {
      if (!currentPassword) { setMessage("Current password required"); return; }
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setMessage("Profile updated"); setUser({ ...user, name, email }); setCurrentPassword(""); setNewPassword(""); setShowEdit(false); }
    else { setMessage(data.error || "Error"); }
  };

  if (!user) return <MainLayout><div className="text-center text-gray-400 py-16">Loading...</div></MainLayout>;

  const initials = (user.name || user.email || "U").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Profile</h1>
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Pencil className="size-3.5 mr-1.5" /> Edit
          </Button>
        </div>

        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
          <div className="p-6 flex items-center gap-4 border-b border-gray-100">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name || "—"}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><UserIcon className="size-3" /> Name</span>
                <p className="text-sm text-gray-700">{user.name || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Mail className="size-3" /> Email</span>
                <p className="text-sm text-gray-700">{user.email}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Shield className="size-3" /> Role</span>
                <p className="text-sm text-gray-700">{user.roleId || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Calendar className="size-3" /> Member Since</span>
                <p className="text-sm text-gray-700">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <Sheet open={showEdit} onOpenChange={setShowEdit}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader><SheetTitle>Edit Profile</SheetTitle><SheetDescription>Update your personal information.</SheetDescription></SheetHeader>
            <div className="space-y-4 py-4">
              <div><Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></div>
              <hr className="border-gray-100" />
              <p className="text-xs text-gray-500">Change password (optional)</p>
              <div><Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Password</Label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" /></div>
              {message && <p className={`text-sm ${message === "Profile updated" ? "text-green-600" : "text-red-500"}`}>{message}</p>}
            </div>
            <SheetFooter><SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose><Button onClick={handleSave}>Save</Button></SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
