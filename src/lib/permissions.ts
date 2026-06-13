export type Permission = "view" | "create" | "edit" | "delete" | "export";

export type PagePermissions = Record<string, Record<Permission, boolean>>;

export const ALL_PAGES = [
  "dashboard", "mail", "campaigns", "email-lists", "sending-history",
  "bounce-monitor", "templates", "signatures", "websites", "leads",
  "removal-list", "reports", "audit-trail", "roles", "users", "profile",
] as const;

export type PageName = (typeof ALL_PAGES)[number];

export const ALL_PERMISSIONS: Permission[] = ["view", "create", "edit", "delete", "export"];

export const SIDEBAR_ROUTES: Record<PageName, { title: string; path: string; group: string; icon?: string }> = {
  dashboard: { title: "Dashboard", path: "/dashboard", group: "Overview" },
  mail: { title: "Mail", path: "/mail", group: "Email" },
  campaigns: { title: "Campaigns", path: "/campaign", group: "Email" },
  "email-lists": { title: "Email Lists", path: "/email-list", group: "Email" },
  "sending-history": { title: "Sending History", path: "/sending-history", group: "Email" },
  "bounce-monitor": { title: "Bounce Monitor", path: "/bounce-monitor", group: "Email" },
  templates: { title: "Templates", path: "/email-templates", group: "Email" },
  signatures: { title: "Signatures", path: "/email-signatures", group: "Email" },
  websites: { title: "Websites", path: "/websites", group: "Data" },
  leads: { title: "Leads", path: "/leads", group: "Data" },
  "removal-list": { title: "Removal List", path: "/removal-list", group: "Data" },
  reports: { title: "Reports", path: "/reports", group: "Overview" },
  "audit-trail": { title: "Audit Trail", path: "/audit-trail", group: "Admin" },
  roles: { title: "Roles", path: "/roles", group: "Admin" },
  users: { title: "Users", path: "/users", group: "Admin" },
  profile: { title: "Profile", path: "/profile", group: "Admin" },
};

export const PATH_TO_PAGE: Record<string, PageName> = Object.fromEntries(
  ALL_PAGES.map(p => [SIDEBAR_ROUTES[p].path, p])
);

export function parsePermissions(raw: string | string[] | undefined): PagePermissions {
  if (Array.isArray(raw)) {
    try { return JSON.parse(raw[0] || "{}"); } catch { return {}; }
  }
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
}

export function hasPermission(
  permissions: PagePermissions,
  page: PageName,
  permission: Permission
): boolean {
  return permissions[page]?.[permission] ?? false;
}

export function canViewPage(
  permissions: PagePermissions,
  page: PageName
): boolean {
  return hasPermission(permissions, page, "view");
}
