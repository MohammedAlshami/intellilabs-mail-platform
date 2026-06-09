"use client";

import { useEffect, useState } from "react";
import { Paperclip, Download } from "lucide-react";
import MainLayout from "@/components/main-layout";
import { useMail, type Mail, type Attachment } from "@/components/sidebar-04/mail-context";

function AttachmentPreview({ attachment, messageId, open, onOpenChange }: {
  attachment: Attachment;
  messageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isImage = attachment.contentType?.startsWith("image/");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const downloadUrl = `/api/mails/${messageId}/attachments/${attachment.attachmentId}`;

  useEffect(() => {
    if (!open || !isImage) return;
    fetch(downloadUrl)
      .then((res) => {
        const loc = res.headers.get("location");
        if (loc) setImageUrl(loc);
      })
      .catch(console.error);
  }, [open, isImage, downloadUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-lg max-w-[90vw] max-h-[90vh] w-full mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold truncate">{attachment.filename ?? "Attachment"}</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-4 p-4 overflow-auto">
          {isImage ? (
            imageUrl
              ? <img src={imageUrl} alt={attachment.filename ?? "preview"} className="max-w-full max-h-[60vh] rounded-md object-contain" />
              : <div className="text-muted-foreground py-16">Loading preview...</div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <Paperclip className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{attachment.contentType ?? "Unknown type"}</p>
            </div>
          )}
          <a href={downloadUrl} download={attachment.filename} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

function MailPreview() {
  const { selectedMail, setSelectedMail } = useMail();
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);

  useEffect(() => {
    if (!selectedMail?.id || selectedMail.text) return;
    fetch(`/api/mails/${selectedMail.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) return;
        setSelectedMail({ ...selectedMail, text: data.text, labels: data.labels, attachments: data.attachments });
      })
      .catch(console.error);
  }, [selectedMail?.id]);

  if (!selectedMail) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select an email to preview
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="text-lg font-semibold">{selectedMail.subject}</div>
        <div className="text-sm text-muted-foreground">
          From: {selectedMail.name} ({selectedMail.email})
        </div>
      </div>
      {selectedMail.attachments && selectedMail.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          {selectedMail.attachments.map((att) => (
            <button
              key={att.attachmentId}
              onClick={() => setPreviewAtt(att)}
              className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[200px]">{att.filename ?? "unnamed"}</span>
              {att.size != null && (
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.size)}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 text-sm whitespace-pre-wrap">
        {selectedMail.text || selectedMail.teaser || "Loading..."}
      </div>
      {previewAtt && (
        <AttachmentPreview
          attachment={previewAtt}
          messageId={selectedMail.id}
          open={!!previewAtt}
          onOpenChange={(open) => { if (!open) setPreviewAtt(null); }}
        />
      )}
    </div>
  );
}

function MailApp() {
  const { setMails, setLoading } = useMail();

  useEffect(() => {
    fetch("/api/mails")
      .then((res) => res.json())
      .then((data) => {
        if (data.mails) {
          setMails(
            data.mails.map((m: any) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              subject: m.subject,
              date: m.date,
              teaser: m.text?.substring(0, 300) ?? "",
              labels: m.labels,
              hasAttachments: m.hasAttachments,
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return <MailPreview />;
}

export default function Page() {
  return (
    <MainLayout>
      <MailApp />
    </MainLayout>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
