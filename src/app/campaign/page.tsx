'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, ArrowUpRight, Check, Send, Eye, EyeOff } from 'lucide-react';
import { IconCheck } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import { RowActions } from '@/components/row-actions';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { SearchBar } from '@/components/shared/search-bar';
import { cn } from '@/lib/utils';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  objective?: string;
  recipients: number;
  sent: number;
  bounced: number;
  status: string;
  createdAt: string;
};

type EmailList = {
  id: string; name: string; emails: string; count: number; createdAt: string;
};

type Step = {
  id: number;
  type: 'done' | 'in progress' | 'open';
  title: string;
  description: string;
  activityTime: string;
};

const PAGE_SIZE = 10;

const PROGRESS_STEPS: Step[] = [
  { id: 1, type: 'open', title: 'Validating recipients', description: 'Checking email format and validity', activityTime: 'Waiting...' },
  { id: 2, type: 'open', title: 'Extracting email addresses', description: 'Parsing recipient list', activityTime: 'Waiting...' },
  { id: 3, type: 'open', title: 'Preparing send queue', description: 'Organizing batch for delivery', activityTime: 'Waiting...' },
  { id: 4, type: 'open', title: 'Processing campaign', description: 'Sending emails in batches of 1,000', activityTime: 'Waiting...' },
  { id: 5, type: 'open', title: 'Finalizing', description: 'Updating campaign status', activityTime: 'Waiting...' },
];

function CampaignPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(0);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [step, setStep] = useState<'setup' | 'recipients' | 'processing' | 'confirmation'>('setup');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [recipientMode, setRecipientMode] = useState<'list' | 'custom'>('list');
  const [selectedListId, setSelectedListId] = useState('');
  const [customEmails, setCustomEmails] = useState('');
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [bccEmails, setBccEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [showBcc, setShowBcc] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const [progressSteps, setProgressSteps] = useState<Step[]>(PROGRESS_STEPS);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Campaign[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCampaigns = () => { fetch('/api/campaigns').then(r => r.json()).then(setCampaigns); };
  useEffect(() => { fetchCampaigns(); }, []);
  useEffect(() => { fetch('/api/email-lists').then(r => r.json()).then(setEmailLists); }, []);
  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      resetForm();
      setShowAdd(true);
    }
  }, [searchParams]);

  const totalPages = Math.ceil(campaigns.length / PAGE_SIZE);
  const paged = campaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetForm = () => {
    setStep('setup');
    setName('');
    setObjective('');
    setEmailContent('');
    setRecipientMode('list');
    setSelectedListId('');
    setCustomEmails('');
    setBccEmails('');
    setCcEmails('');
    setShowBcc(false);
    setShowCc(false);
    setParsedEmails([]);
    setProgressSteps(PROGRESS_STEPS);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleStartProcessing = async () => {
    setStep('processing');
    setProgressSteps(prev => prev.map((s, i) => ({ ...s, type: i === 0 ? 'in progress' as const : 'open' as const, activityTime: i === 0 ? 'Running now...' : s.activityTime })));

    const emails = recipientMode === 'list'
      ? (emailLists.find(l => l.id === selectedListId)?.emails || '')
      : customEmails;
    const allEmails = emails.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));

    let currentStep = 0;
    intervalRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= PROGRESS_STEPS.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setProgressSteps(prev => prev.map((s, i) => {
        if (i < currentStep) return { ...s, type: 'done', activityTime: 'Completed' };
        if (i === currentStep) return { ...s, type: 'in progress', activityTime: 'Running now...' };
        return s;
      }));
    }, 800);

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgressSteps(prev => prev.map(s => ({ ...s, type: 'done', activityTime: 'Completed' })));

      setParsedEmails(allEmails);
      setStep('confirmation');
    }, PROGRESS_STEPS.length * 800 + 400);
  };

  const handleFinalize = async (status: 'draft' | 'sending') => {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        objective,
        emailContent,
        recipientEmails: parsedEmails.join('\n'),
        status,
      }),
    });

    setShowAdd(false);
    resetForm();
    fetchCampaigns();
  };

  const selectedList = emailLists.find(l => l.id === selectedListId);
  const previewEmails = recipientMode === 'list'
    ? (selectedList?.emails || '').split(/,\s*/).filter(Boolean)
    : customEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));

  const displayCampaigns = searchResults ?? campaigns;
  const displayTotal = searchResults !== null ? searchResults.length : campaigns.length;
  const displayPaged = displayCampaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const displayTotalPages = Math.ceil(displayCampaigns.length / PAGE_SIZE);

  // Fix page if it exceeds the filtered total
  if (page >= displayTotalPages && displayTotalPages > 0) setPage(0);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-normal text-gray-900 tracking-tight">Campaigns</h1>
        <div className="flex items-center gap-2">
          <SearchBar table="campaigns" placeholder="Search campaigns..." onResults={(data, total, q) => { setSearchResults(data as Campaign[]); setSearchQuery(q); setPage(0); }} onClear={() => { setSearchResults(null); setSearchQuery(""); setPage(0); }} />
          <ExportDropdown data={displayCampaigns.map(c => ({ Name: c.name, Subject: c.subject, Recipients: c.recipients, Sent: c.sent, Bounced: c.bounced, Status: c.status }))} filename="campaigns" columnOrder={["Name", "Subject", "Recipients", "Sent", "Bounced", "Status"]} />
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus className="size-3.5" /> Add Campaign
          </Button>
        </div>
      </div>
      <div className="bg-white border border-[#e9ecef] rounded-[10px] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-[#fafafa]">
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Name</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Subject</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Recipients</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Sent</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Bounced</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Status</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af]">Created</th>
              <th className="py-3 px-5 text-xs font-normal text-[#9ca3af] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {displayPaged.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">{searchQuery ? `No campaigns match "${searchQuery}".` : "No campaigns yet."}</td></tr>
            ) : (
              displayPaged.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-5 text-gray-700 font-medium">{c.name}</td>
                  <td className="py-3 px-5 text-gray-500 max-w-[200px] truncate">{c.subject}</td>
                  <td className="py-3 px-5 text-gray-500">{c.recipients}</td>
                  <td className="py-3 px-5 text-gray-500">{c.sent}</td>
                  <td className="py-3 px-5 text-gray-500">{c.bounced}</td>
                  <td className="py-3 px-5">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                      c.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' :
                      c.status === 'sending' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-5 text-right">
                    <RowActions actions={[
                      { label: 'View', onClick: () => setViewCampaign(c) },
                    ]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {displayTotalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white">
            <span className="text-xs text-gray-500">Page {page + 1} of {displayTotalPages} ({displayTotal} total)</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(displayTotalPages - 1, p + 1))} disabled={page >= displayTotalPages - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Campaign Sheet */}
      <div className={cn(!!viewCampaign && "fixed inset-0 z-50 bg-black/80")} style={{ display: !!viewCampaign ? undefined : 'none' }} />
      {viewCampaign && (
        <div className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-white shadow-xl border-l border-gray-200 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-semibold text-[#111827]">Campaign Details</h2>
            <button onClick={() => setViewCampaign(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
          </div>
          <div className="space-y-5 text-[13px]">
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Name</span><span className="text-gray-700">{viewCampaign.name}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Subject</span><span className="text-gray-700">{viewCampaign.subject}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Recipients</span><span className="text-gray-700">{viewCampaign.recipients}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Sent</span><span className="text-gray-700">{viewCampaign.sent}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Bounced</span><span className="text-gray-700">{viewCampaign.bounced}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Status</span><span className="text-gray-700 capitalize">{viewCampaign.status}</span></div>
            <div><span className="text-gray-400 block text-[11px] uppercase tracking-wider">Created</span><span className="text-gray-700">{new Date(viewCampaign.createdAt).toLocaleString()}</span></div>
            <div className="pt-2">
              <Button onClick={() => router.push(`/campaign/${viewCampaign.id}`)} className="w-full">
                View Details <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); resetForm(); } }}>
        <SheetContent className="sm:max-w-xl p-0 gap-0 overflow-y-auto">
          {/* Step indicator */}
          <div className="px-6 pt-6 pb-0">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-[18px] font-semibold text-[#111827]">
                {step === 'setup' && 'New Campaign'}
                {step === 'recipients' && 'Choose Recipients'}
                {step === 'processing' && 'Processing Campaign'}
                {step === 'confirmation' && 'Campaign Ready'}
              </SheetTitle>
              <SheetDescription className="text-[12px] text-gray-500">
                {step === 'setup' && 'Start by naming your campaign and describing your goal'}
                {step === 'recipients' && 'Select an existing list or paste custom emails'}
                {step === 'processing' && 'Please wait while we process your campaign'}
                {step === 'confirmation' && 'Review and launch your campaign'}
              </SheetDescription>
            </SheetHeader>

            {step !== 'processing' && (
              <div className="flex items-center gap-2 mb-5">
                {['setup', 'recipients', 'confirmation'].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                      "size-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                      step === s ? 'bg-primary text-primary-foreground' :
                      ['recipients', 'confirmation'].indexOf(s) < ['setup', 'recipients', 'confirmation'].indexOf(step) ? 'bg-green-500 text-white' :
                      'bg-gray-100 text-gray-400'
                    )}>
                      {['recipients', 'confirmation'].indexOf(s) < ['setup', 'recipients', 'confirmation'].indexOf(step) ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span className={cn("text-[11px] font-medium", step === s ? 'text-gray-700' : 'text-gray-400')}>
                      {s === 'setup' ? 'Setup' : s === 'recipients' ? 'Recipients' : 'Review'}
                    </span>
                    {i < 2 && <span className="text-gray-300 text-[10px] mx-1">—</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
            {/* Step 1: Setup */}
            {step === 'setup' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Campaign Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Q3 Product Launch"
                    className="w-full text-[13px] text-gray-700 bg-white border border-[#e5e7eb] rounded-[6px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Campaign Objective</label>
                  <Textarea
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    placeholder="Describe the goal of this campaign..."
                    rows={3}
                    className="resize-none text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Email Content</label>
                  <Textarea
                    value={emailContent}
                    onChange={e => setEmailContent(e.target.value)}
                    placeholder="Paste your email content here...&#10;&#10;Hi there,&#10;&#10;We're excited to share our latest updates..."
                    rows={6}
                    className="text-[13px]"
                  />
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => setStep('recipients')}
                    disabled={!name.trim()}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Recipients */}
            {step === 'recipients' && (
              <div className="space-y-4">
                <div className="flex gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <button
                    onClick={() => setRecipientMode('list')}
                    className={cn(
                      "flex-1 py-2 text-[12px] font-medium rounded-md transition-colors",
                      recipientMode === 'list' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Email List
                  </button>
                  <button
                    onClick={() => setRecipientMode('custom')}
                    className={cn(
                      "flex-1 py-2 text-[12px] font-medium rounded-md transition-colors",
                      recipientMode === 'custom' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Custom List
                  </button>
                </div>

                {recipientMode === 'list' ? (
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Select Email List</label>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger className="text-[13px]">
                        <SelectValue placeholder="Choose a list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {emailLists.length === 0 ? (
                          <div className="px-3 py-4 text-center text-[12px] text-gray-400">No email lists found. Create one first.</div>
                        ) : (
                          emailLists.map(list => (
                            <SelectItem key={list.id} value={list.id} className="text-[13px]">
                              {list.name} ({list.count} emails)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedList && (
                      <p className="text-[11px] text-gray-400 mt-1.5">{selectedList.count} recipients in this list</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Paste Emails</label>
                    <Textarea
                      value={customEmails}
                      onChange={e => setCustomEmails(e.target.value)}
                      placeholder={`Paste emails here, one per line or comma-separated:\nemail1@example.com\nemail2@example.com`}
                      rows={6}
                      className="text-[13px]"
                    />
                    {customEmails.trim() && (
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {customEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@')).length} valid emails detected
                      </p>
                    )}
                  </div>
                )}

                {/* BCC / CC Toggles */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowBcc(!showBcc)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border transition-colors",
                      showBcc ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {showBcc ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    BCC
                  </button>
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border transition-colors",
                      showCc ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {showCc ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    CC
                  </button>
                </div>

                {showBcc && (
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">BCC Emails</label>
                    <Textarea
                      value={bccEmails}
                      onChange={e => setBccEmails(e.target.value)}
                      placeholder="bcc@example.com"
                      rows={2}
                      className="text-[13px]"
                    />
                  </div>
                )}

                {showCc && (
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">CC Emails</label>
                    <Textarea
                      value={ccEmails}
                      onChange={e => setCcEmails(e.target.value)}
                      placeholder="cc@example.com"
                      rows={2}
                      className="text-[13px]"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleStartProcessing}
                    disabled={recipientMode === 'list' ? !selectedListId : !customEmails.trim()}
                    className="flex-1"
                  >
                    Process
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Processing */}
            {step === 'processing' && (
              <div className="py-4">
                <div className="sm:mx-auto sm:max-w-md">
                  <ul className="space-y-6">
                    {progressSteps.map((s, stepIdx) => (
                      <li className="relative flex gap-x-3" key={s.id}>
                        <div className={cn(
                          'absolute top-0 left-0 flex w-6 justify-center',
                          stepIdx === progressSteps.length - 1 ? 'h-6' : '-bottom-6'
                        )}>
                          <span aria-hidden className="w-px bg-border" />
                        </div>
                        <div className="flex items-start space-x-2.5">
                          <div className="relative flex size-6 flex-none items-center justify-center bg-background">
                            {s.type === 'done' ? (
                              <IconCheck aria-hidden className="size-5 text-primary" />
                            ) : s.type === 'in progress' ? (
                              <div aria-hidden className="size-2.5 rounded-full bg-primary ring-4 ring-background" />
                            ) : (
                              <div aria-hidden className="size-3 rounded-full border border-border bg-background ring-4 ring-background" />
                            )}
                          </div>
                          <div>
                            <p className="mt-0.5 font-medium text-foreground text-sm">
                              {s.title}{' '}
                              <span className="font-normal text-muted-foreground/60">
                                &#8729; {s.activityTime}
                              </span>
                            </p>
                            <p className="mt-0.5 text-muted-foreground text-sm leading-6">
                              {s.description}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'confirmation' && (
              <div className="space-y-5">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="size-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <IconCheck className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-green-800">Campaign processed successfully</p>
                    <p className="text-[12px] text-green-600 mt-0.5">
                      {parsedEmails.length} recipients validated and ready to send
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-3">
                  <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Campaign Preview</h4>
                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div><span className="text-gray-400 block text-[11px]">Name</span><span className="text-gray-700 font-medium">{name}</span></div>
                    <div><span className="text-gray-400 block text-[11px]">Status</span><span className="text-gray-700">Draft</span></div>
                    <div className="col-span-2"><span className="text-gray-400 block text-[11px]">Objective</span><span className="text-gray-700">{objective || '—'}</span></div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                  <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Recipients Preview ({Math.min(parsedEmails.length, 5)} of {parsedEmails.length})</h4>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {parsedEmails.slice(0, 5).map((email, i) => (
                      <div key={i} className="text-[12px] text-gray-600 py-0.5">{email}</div>
                    ))}
                    {parsedEmails.length > 5 && (
                      <div className="text-[11px] text-gray-400 pt-1">...and {parsedEmails.length - 5} more</div>
                    )}
                  </div>
                </div>

                {(showBcc || showCc) && (
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                    <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Additional Recipients</h4>
                    <div className="text-[13px] space-y-1">
                      {showBcc && bccEmails && <div><span className="text-gray-400">BCC:</span> <span className="text-gray-600">{bccEmails}</span></div>}
                      {showCc && ccEmails && <div><span className="text-gray-400">CC:</span> <span className="text-gray-600">{ccEmails}</span></div>}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => handleFinalize('draft')} className="flex-1">
                    Save as Draft
                  </Button>
                  <Button onClick={() => handleFinalize('sending')} className="flex-1">
                    <Send className="size-3.5" /> Launch Campaign
                  </Button>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="px-6 pb-6 pt-2 border-t border-gray-100">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

export default function CampaignPage() {
  return <Suspense fallback={null}><CampaignPageInner /></Suspense>;
}
