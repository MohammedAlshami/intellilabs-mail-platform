export type Website = {
  id: string;
  url: string;
  name: string;
  category: string;
  isHealthcare: boolean;
  emails: string;
  phones: string;
  description?: string;
  summary?: string;
  services?: string[];
  scrapeStatus?: "idle" | "scraping" | "done" | "error";
  createdAt: string;
};

export type Lead = {
  id: string;
  websiteId: string;
  websiteName: string;
  type: "email" | "phone";
  value: string;
  createdAt: string;
};

const seedWebsites: Website[] = [
  { id: '1', url: 'https://brightcaremedical.com', name: 'Bright Care Medical', category: 'Healthcare', isHealthcare: true, emails: 'info@brightcaremedical.com', phones: '+1 (555) 123-4567', scrapeStatus: 'done', description: 'A multi-specialty healthcare clinic serving the community with primary care, urgent care, and telehealth services.', createdAt: '2026-06-01T10:00:00' },
  { id: '2', url: 'https://greenvalleydental.com', name: 'Green Valley Dental', category: 'Dental', isHealthcare: true, emails: 'appointments@greenvalleydental.com', phones: '+1 (555) 234-5678', scrapeStatus: 'done', createdAt: '2026-06-02T14:30:00' },
  { id: '3', url: 'https://techsolutions.io', name: 'Tech Solutions Inc', category: 'Technology', isHealthcare: false, emails: 'contact@techsolutions.io, sales@techsolutions.io', phones: '+1 (555) 345-6789', scrapeStatus: 'done', createdAt: '2026-06-03T09:15:00' },
  { id: '4', url: 'https://oakwoodrealty.com', name: 'Oakwood Realty', category: 'Real Estate', isHealthcare: false, emails: 'listings@oakwoodrealty.com', phones: '+1 (555) 456-7890', scrapeStatus: 'done', createdAt: '2026-06-04T11:00:00' },
  { id: '5', url: 'https://primephysio.com', name: 'Prime Physiotherapy', category: 'Healthcare', isHealthcare: true, emails: 'care@primephysio.com', phones: '+1 (555) 567-8901', scrapeStatus: 'done', createdAt: '2026-06-05T16:45:00' },
  { id: '6', url: 'https://horizonfin.com', name: 'Horizon Financial', category: 'Finance', isHealthcare: false, emails: 'support@horizonfin.com, info@horizonfin.com', phones: '+1 (555) 678-9012', scrapeStatus: 'done', createdAt: '2026-06-06T08:30:00' },
];

function deriveLeads(websites: Website[]): Lead[] {
  const leads: Lead[] = [];
  for (const w of websites) {
    const emailList = w.emails.split(',').map(e => e.trim()).filter(Boolean);
    const phoneList = w.phones.split(',').map(p => p.trim()).filter(Boolean);
    for (const email of emailList) {
      leads.push({ id: `lead-${w.id}-email-${emailList.indexOf(email)}`, websiteId: w.id, websiteName: w.name, type: 'email', value: email, createdAt: w.createdAt });
    }
    for (const phone of phoneList) {
      leads.push({ id: `lead-${w.id}-phone-${phoneList.indexOf(phone)}`, websiteId: w.id, websiteName: w.name, type: 'phone', value: phone, createdAt: w.createdAt });
    }
  }
  return leads;
}

export const seedLeads: Lead[] = deriveLeads(seedWebsites);

export function getWebsiteById(id: string): Website | undefined {
  return seedWebsites.find(w => w.id === id);
}

export function getLeadsByWebsiteId(websiteId: string): Lead[] {
  return seedLeads.filter(l => l.websiteId === websiteId);
}

export default seedWebsites;
