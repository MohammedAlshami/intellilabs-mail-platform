import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login", "/api/webhooks"];

const PATH_TO_PAGE: Record<string, string> = {
  "/dashboard": "dashboard", "/reports": "reports", "/mail": "mail",
  "/campaign": "campaigns", "/email-list": "email-lists",
  "/sending-history": "sending-history", "/bounce-monitor": "bounce-monitor",
  "/email-templates": "templates", "/email-signatures": "signatures",
  "/websites": "websites", "/leads": "leads", "/removal-list": "removal-list",
  "/audit-trail": "audit-trail", "/roles": "roles", "/users": "users",
  "/profile": "profile",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/") return NextResponse.next();

  const token = request.cookies.get("token")?.value || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Enforce view permission for page routes
  if (!pathname.startsWith("/api/")) {
    const page = PATH_TO_PAGE[pathname];
    if (page) {
      const canView = payload.permissions?.[page]?.view ?? false;
      if (!canView) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-name", payload.name);
  requestHeaders.set("x-user-role", payload.roleId);
  requestHeaders.set("x-user-permissions", JSON.stringify(payload.permissions));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
