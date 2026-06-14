"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Paperclip, Download, Sparkles, ThumbsUp, ThumbsDown, Minus, Send, X, Check } from "lucide-react";
import MainLayout from "@/components/main-layout";
import { useMail, type Mail, type Attachment } from "@/components/sidebar-04/mail-context";
import { Compose } from "@/components/compose";
import { Button } from "@/components/ui/button";
import { useAiPanel } from "@/contexts/ai-panel-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function AttachmentPreview({ attachment, messageId, open, onOpenChange }: { attachment: Attachment; messageId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const isImage = attachment.contentType?.startsWith("image/");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const downloadUrl = `/api/mails/${messageId}/attachments/${attachment.attachmentId}`;
  useEffect(() => {
    if (!open || !isImage) return;
    fetch(downloadUrl).then(async r => { if (!r.ok) throw new Error("Failed"); const blob = await r.blob(); setImageUrl(URL.createObjectURL(blob)); }).catch(console.error);
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [open, isImage, downloadUrl]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-lg max-w-[90vw] max-h-[90vh] w-full mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold truncate">{attachment.filename ?? "Attachment"}</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-4 p-4 overflow-auto">
          {isImage ? (
            imageUrl ? (
              <img src={imageUrl} alt={attachment.filename ?? "preview"} className="max-w-full max-h-[60vh] rounded-md object-contain" />
            ) : (
              <div className="text-muted-foreground py-16">Loading preview...</div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <Paperclip className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{attachment.contentType ?? "Unknown type"}</p>
            </div>
          )}
          <a href={downloadUrl} download={attachment.filename} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
            <Download className="h-4 w-4" />Download
          </a>
        </div>
      </div>
    </div>
  );
}

function SentimentCard({ analysis }: { analysis: { sentiment: string; reasoning: string; suggestedReply: string } | null }) {
  if (!analysis) return null;
  const icon = analysis.sentiment === "positive"
    ? <ThumbsUp className="h-4 w-4 text-green-500" />
    : analysis.sentiment === "negative"
      ? <ThumbsDown className="h-4 w-4 text-red-500" />
      : <Minus className="h-4 w-4 text-muted-foreground" />;
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 mb-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium capitalize text-muted-foreground">{analysis.sentiment}</span>
        <Sparkles className="h-3 w-3 text-yellow-500 ml-auto" />
        <span className="text-xs text-muted-foreground">AI Analysis</span>
      </div>
      <p className="text-xs text-muted-foreground/80 mb-2 leading-relaxed">{analysis.reasoning}</p>
      <div className="border-t pt-2 mt-1">
        <p className="text-xs font-medium text-foreground/70 mb-1">Suggested Reply:</p>
        <p className="text-xs text-muted-foreground italic leading-relaxed">{analysis.suggestedReply}</p>
      </div>
    </div>
  );
}

function MailPreview({ onSend, onAiAssistantClick }: { onSend?: () => void; onAiAssistantClick?: () => void }) {
  const { selectedMail, setSelectedMail, analysis, setAnalysis } = useMail();
  const { composeData, clearComposeData } = useAiPanel();
  const [aiComposeData, setAiComposeData] = useState<{ to: string; subject: string; text: string; threadId?: string } | null>(null);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [usingAiReply, setUsingAiReply] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (!selectedMail?.id) return;
    const mid = selectedMail.id;
    if (!selectedMail.text) {
      setLoadingContent(true);
      // If it has a threadId, fetch all messages in thread; otherwise fetch single email
      if (selectedMail.threadId) {
        fetch(`/api/mails?threadId=${encodeURIComponent(selectedMail.threadId)}`).then(r => r.json()).then(d => {
          const msgs = d.messages || [];
          if (msgs.length > 0) {
            const latest = msgs[msgs.length - 1];
            const allAttachments = msgs.flatMap((m: any) => m.attachments || []);
            setSelectedMail({ ...selectedMail, text: latest.text, threadMessages: msgs, email: latest.from?.email || selectedMail.email, name: latest.from?.name || selectedMail.name, attachments: allAttachments.length > 0 ? allAttachments : selectedMail.attachments });
          }
        }).catch(console.error).finally(() => setLoadingContent(false));
      } else {
        fetch(`/api/mails/${mid}`).then(r => r.json()).then(d => { if (d.error) return; setSelectedMail({ ...selectedMail, text: d.text, labels: d.labels, attachments: d.attachments }); }).catch(console.error).finally(() => setLoadingContent(false));
      }
      fetch(`/api/mails/${mid}/analyze`).then(r => r.json()).then(d => { if (d.sentiment) setAnalysis(mid, d); }).catch(() => {}).finally(() => setLoadingAnalysis(false));
    }
    if (!analysis[mid]) {
      setLoadingAnalysis(true);
      fetch(`/api/mails/${mid}/analyze`).then(r => r.json()).then(d => { if (d.sentiment) setAnalysis(mid, d); }).catch(() => {}).finally(() => setLoadingAnalysis(false));
    }
  }, [selectedMail?.id]);

  // When AI generates compose data, open reply with it
  useEffect(() => {
    if (composeData && selectedMail) {
      setAiComposeData({
        to: selectedMail.email,
        subject: composeData.subject || `Re: ${selectedMail.subject}`,
        text: composeData.body || "",
        threadId: composeData.threadId || selectedMail.threadId || undefined,
      });
      setReplyOpen(true);
      clearComposeData();
    }
  }, [composeData, selectedMail]);

  if (!selectedMail) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select an email to preview</div>;
  const mailAnalysis = selectedMail.id ? analysis[selectedMail.id] : null;
  const handleUseAiReply = () => { setUsingAiReply(true); setShowAiDialog(false); setReplyOpen(true); };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="border-b p-4 shrink-0">
        {loadingContent ? (
          <><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2 mb-1" /><Skeleton className="h-4 w-1/3" /></>
        ) : (
          <><div className="text-lg font-semibold">{selectedMail.subject}</div><div className="text-sm text-muted-foreground mt-1 space-y-0.5">
            <div><span className="font-medium text-foreground/70">From:</span> {selectedMail.name} &lt;{selectedMail.email}&gt;</div>
            {selectedMail.threadMessages?.[0]?.to && <div><span className="font-medium text-foreground/70">To:</span> {selectedMail.threadMessages[0].to}</div>}
            {selectedMail.threadMessages?.[0]?.cc && <div><span className="font-medium text-foreground/70">CC:</span> {selectedMail.threadMessages[0].cc}</div>}
            {selectedMail.threadMessages?.[0]?.bcc && <div><span className="font-medium text-foreground/70">BCC:</span> {selectedMail.threadMessages[0].bcc}</div>}
          </div></>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loadingContent ? (
          <div className="rounded-lg border p-3 mb-3 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
        ) : (
          <SentimentCard analysis={mailAnalysis} />
        )}
        {loadingContent ? (
          <div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
        ) : (
          <div className="space-y-6 w-full">
            {(selectedMail.threadMessages && selectedMail.threadMessages.length > 0 ? selectedMail.threadMessages : [selectedMail]).map((msg: any, i: number) => (
              <div key={i} className={i > 0 ? "border-t pt-4" : ""}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{msg.from?.name || selectedMail.name}</span>
                  <span className="text-xs text-muted-foreground">{msg.from?.email || selectedMail.email}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{msg.date ? new Date(msg.date).toLocaleString() : ""}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap w-full">{msg.text || selectedMail.text || "No content"}</div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.attachments.map((att: any) => (
                      <button key={att.attachmentId} onClick={() => setPreviewAtt(att)} className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <Paperclip className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[200px]">{att.filename ?? "unnamed"}</span>
                        {att.size != null && <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.size)}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {mailAnalysis?.suggestedReply && !replyOpen && (
        <div className="border-t px-4 py-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowAiDialog(true)} className="flex items-center gap-2 hover:underline">
              <Sparkles className="h-4 w-4 text-yellow-500 shrink-0" />
              <span className="text-xs font-medium text-foreground/80">AI suggested reply available</span>
            </button>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleUseAiReply}><Check className="h-3 w-3 mr-1" />Use</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReplyOpen(true)}><Send className="h-3 w-3 mr-1" />Reply</Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-yellow-500" />AI Suggested Reply</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="font-medium capitalize">{mailAnalysis?.sentiment}</span><span className="text-muted-foreground/50">|</span><span>{mailAnalysis?.reasoning}</span></div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">{mailAnalysis?.suggestedReply}</div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowAiDialog(false)}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
              <Button size="sm" onClick={handleUseAiReply}><Check className="h-3.5 w-3.5 mr-1.5" />Use Reply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {!replyOpen && !mailAnalysis?.suggestedReply && <div className="border-t px-4 py-2"><Button variant="ghost" size="sm" onClick={() => setReplyOpen(true)} className="text-xs"><Send className="h-3.5 w-3.5 mr-1.5" />Reply</Button></div>}
      {replyOpen && (
        <div className="border-t">
          <div className="flex items-center justify-between px-5 pt-2 pb-0">
            <span className="text-xs font-medium text-muted-foreground">Reply</span>
            <button onClick={() => setReplyOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"><X className="h-3.5 w-3.5" /></button>
          </div>
          <Compose open={true} onOpenChange={(open) => { setReplyOpen(open); if (!open) setAiComposeData(null); }} onSend={(result) => { setAiComposeData(null); onSend?.(); }} initialTo={aiComposeData?.to || selectedMail.email} initialSubject={aiComposeData?.subject || `Re: ${selectedMail.subject}`} initialText={aiComposeData?.text || (usingAiReply && mailAnalysis ? mailAnalysis.suggestedReply : undefined)} replyMode inline threadId={aiComposeData?.threadId || selectedMail.threadId || undefined} onAiAssistantClick={onAiAssistantClick} />
        </div>
      )}
      {previewAtt && <AttachmentPreview attachment={previewAtt} messageId={selectedMail.id} open={!!previewAtt} onOpenChange={open => { if (!open) setPreviewAtt(null); }} />}
    </div>
  );
}

const FOLDER_API_PATH: Record<string, string> = { inbox: "INBOX", sent: "\\Sent", drafts: "\\Drafts", trash: "\\Trash", archive: "\\Archive" };

function MailApp() {
  const { setMails, setLoading, folder, setSelectedMail, selectedMail } = useMail();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mailIdFromUrl = searchParams.get("id");

  const refreshMails = useCallback(() => {
    const path = FOLDER_API_PATH[folder] || "INBOX";
    fetch(`/api/mails?path=${encodeURIComponent(path)}`).then(r => r.json()).then(d => { const items = d.threads || d.mails || []; const mapped = items.map((m: any) => ({ id: m.threadId || m.id, threadId: m.threadId || null, name: (m.from?.name || m.name || m.email || ""), email: (m.from?.email || m.email || ""), subject: m.subject, date: m.date, teaser: (m.preview || (m.text || "").substring(0, 300) || ""), labels: m.labels || [], hasAttachments: m.hasAttachments, messageCount: m.messageCount })); setMails(mapped); }).catch(console.error);
  }, [folder, setMails]);

  // Initial load: fetch mails
  useEffect(() => { refreshMails(); setLoading(false); }, []);

  // Fetch thread data when URL has an id param
  useEffect(() => {
    if (!mailIdFromUrl) return;
    fetch(`/api/mails?threadId=${encodeURIComponent(mailIdFromUrl)}`)
      .then(r => r.json()).then(d => {
        const msgs = d.messages || [];
        if (msgs.length > 0) {
          const latest = msgs[msgs.length - 1];
          setSelectedMail({
            id: mailIdFromUrl,
            threadId: mailIdFromUrl,
            name: latest.from?.name || "",
            email: latest.from?.email || "",
            subject: latest.subject || "",
            date: latest.date || "",
            teaser: (latest.text || "").substring(0, 300),
            text: latest.text,
            threadMessages: msgs,
            messageCount: msgs.length,
          });
          window.history.replaceState(null, "", `/mail?id=${encodeURIComponent(mailIdFromUrl)}`);
        } else {
          fetch(`/api/mails/${encodeURIComponent(mailIdFromUrl)}`).then(r => r.json()).then(m => {
            if (m && !m.error) setSelectedMail({ id: mailIdFromUrl, threadId: m.threadId || null, name: m.from?.name || m.fromName || "", email: m.from?.email || m.fromEmail || "", subject: m.subject || "", date: m.receivedAt || "", teaser: (m.bodyText || "").substring(0, 300), text: m.bodyText || "", attachments: m.attachments, messageCount: 1 });
          }).catch(() => {});
        }
      }).catch(console.error);
  }, [mailIdFromUrl]);

  // Refresh on folder change
  useEffect(() => { if (folder) refreshMails(); }, [folder]);

  const { toggle: toggleAiPanel } = useAiPanel();

  const handleMailPreviewSend = useCallback(() => {
    refreshMails();
    if (selectedMail?.threadId) {
      fetch(`/api/mails?threadId=${encodeURIComponent(selectedMail.threadId)}`).then(r => r.json()).then(d => {
        const msgs = d.messages || [];
        if (msgs.length > 0) {
          const latest = msgs[msgs.length - 1];
          setSelectedMail(prev => prev ? { ...prev, text: latest.text, threadMessages: msgs } : prev);
        }
      });
    }
  }, [selectedMail?.threadId, refreshMails, setSelectedMail]);

  return <MailPreview onSend={handleMailPreviewSend} onAiAssistantClick={toggleAiPanel} />;
}

export default function Page() { return <MainLayout><Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}><MailApp /></Suspense></MainLayout>; }
function formatSize(bytes: number): string { if (bytes < 1024) return `${bytes}B`; if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)}KB`; return `${(bytes/(1024*1024)).toFixed(1)}MB`; }
