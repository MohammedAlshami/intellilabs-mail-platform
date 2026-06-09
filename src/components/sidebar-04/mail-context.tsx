"use client";

import * as React from "react";

export type Attachment = {
  attachmentId: string;
  filename?: string;
  size?: number;
  contentType?: string;
};

export type Mail = {
  id: string;
  name: string;
  email: string;
  subject: string;
  date: string;
  teaser: string;
  text?: string;
  labels?: string[];
  hasAttachments?: boolean;
  attachments?: Attachment[];
};

type MailContextValue = {
  mails: Mail[];
  setMails: (mails: Mail[]) => void;
  selectedMail: Mail | null;
  setSelectedMail: (mail: Mail | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

const MailContext = React.createContext<MailContextValue | undefined>(
  undefined
);

export function MailProvider({ children }: { children: React.ReactNode }) {
  const [mails, setMails] = React.useState<Mail[]>([]);
  const [selectedMail, setSelectedMail] = React.useState<Mail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const value = React.useMemo(
    () => ({ mails, setMails, selectedMail, setSelectedMail, loading, setLoading }),
    [mails, selectedMail, loading]
  );
  return <MailContext.Provider value={value}>{children}</MailContext.Provider>;
}

export function useMail() {
  const ctx = React.useContext(MailContext);
  if (!ctx) throw new Error("useMail must be used within MailProvider");
  return ctx;
}
