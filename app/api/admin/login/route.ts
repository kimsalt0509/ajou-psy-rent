import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  adminPin,
  clearLoginFailures,
  clientIp,
  createAdminToken,
  isLoginLocked,
  recordLoginFailure,
  verifyPin,
} from "@/lib/admin";

export async function POST(request: NextRequest) {
  if (!adminPin()) {
    console.error("[admin] ADMIN_PIN 환경변수가 설정되지 않았습니다.");
    return Response.json({ error: "관리자 로그인이 설정되지 않았습니다." }, { status: 503 });
  }

  const ip = clientIp(request);
  if (await isLoginLocked(ip)) {
    return Response.json(
      { error: "시도 횟수를 초과했습니다. 15분 뒤에 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { pin?: unknown };
  if (!verifyPin(body.pin)) {
    await recordLoginFailure(ip);
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await clearLoginFailures(ip);
  const store = await cookies();
  store.set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
