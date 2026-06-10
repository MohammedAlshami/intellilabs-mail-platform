'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => { setUser(data); setName(data.name); setEmail(data.email); });
  }, []);

  const handleSave = async () => {
    setMessage('');
    const body: any = { name, email };
    if (newPassword) {
      if (!currentPassword) { setMessage('Current password required to set new password'); return; }
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setMessage('Profile updated'); setCurrentPassword(''); setNewPassword(''); }
    else { setMessage(data.error || 'Error'); }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto py-10">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight mb-8">Profile</h1>
        <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm p-6 space-y-5">
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
          </div>
          <hr className="border-gray-100" />
          <p className="text-xs text-gray-500">Change password (optional)</p>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
          </div>
          {message && <p className={`text-sm ${message === 'Profile updated' ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
          <Button onClick={handleSave} className="w-full">Save</Button>
        </div>
      </div>
    </MainLayout>
  );
}
