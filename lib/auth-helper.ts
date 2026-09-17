import { adminAuth } from "./firebase-admin";

/**
 * 로그인 허용 이메일 도메인. 예: ALLOWED_EMAIL_DOMAIN=ajou.ac.kr
 * 비워두면 모든 Google 계정 허용 (현재 임시 개방 상태)
 */
export const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim() || null;

/** Authorization: Bearer <Firebase ID token> 헤더에서 유저를 검증합니다. */
export async function verifyUser(request: Request) {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    if (ALLOWED_EMAIL_DOMAIN && !decoded.email?.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json(
    {
      error: ALLOWED_EMAIL_DOMAIN
        ? `@${ALLOWED_EMAIL_DOMAIN} 계정으로 로그인 후 이용할 수 있습니다.`
        : "로그인 후 이용할 수 있습니다. 다시 로그인해 주세요.",
    },
    { status: 401 },
  );
}
