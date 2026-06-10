import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    let permissions: string[] = [];
    if (user.roleId) {
      const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId));
      if (role) {
        try { permissions = JSON.parse(role.permissions); } catch {}
      }
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name || "",
      roleId: user.roleId || "",
      permissions,
    });

    const res = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, roleId: user.roleId, permissions },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
