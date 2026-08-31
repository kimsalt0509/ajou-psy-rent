import { adminAuth } from "./firebase-admin";
import { NextRequest } from "next/server";

/** Authorization: Bearer <Firebase ID token> 헤더에서 유저를 검증합니다.
 *  TODO: 임시 개방 — 추후 @ajou.ac.kr 전용으로 복구
 */
export async function verifyUser(request: NextRequest) {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    // if (!decoded.email?.endsWith("@ajou.ac.kr")) return null;
    return decoded;
  } catch {
    return null;
  }
}
