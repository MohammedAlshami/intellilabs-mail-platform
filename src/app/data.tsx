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
  text: string;
  date: string;
  read: boolean;
  labels: string[];
  hasAttachments?: boolean;
  attachments?: Attachment[];
};

export const accounts = [
  {
    label: "Ahmad",
    email: "ahmad@demo-project-mail.xyz",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <rect width="24" height="24" rx="4" fill="currentColor" opacity="0.2" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">A</text>
      </svg>
    ),
  },
  {
    label: "Siti",
    email: "siti@demo-project-mail.xyz",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <rect width="24" height="24" rx="4" fill="currentColor" opacity="0.2" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">S</text>
      </svg>
    ),
  },
  {
    label: "Ryan",
    email: "ryan@demo-project-mail.xyz",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <rect width="24" height="24" rx="4" fill="currentColor" opacity="0.2" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">R</text>
      </svg>
    ),
  },
  {
    label: "Nurul",
    email: "nurul@demo-project-mail.xyz",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <rect width="24" height="24" rx="4" fill="currentColor" opacity="0.2" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">N</text>
      </svg>
    ),
  },
  {
    label: "David",
    email: "david@demo-project-mail.xyz",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
        <rect width="24" height="24" rx="4" fill="currentColor" opacity="0.2" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">D</text>
      </svg>
    ),
  },

];

export type Account = (typeof accounts)[number];
