import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminPin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { pin?: string };
  if (body.pin !== adminPin()) {
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
