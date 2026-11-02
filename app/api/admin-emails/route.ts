import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAdminEmails, setAdminEmails } from "@/lib/store";
import * as v from "@/lib/validate";

// 관리자 메일 목록은 개인정보이므로 조회도 관리자만
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json({ emails: await getAdminEmails() });
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { emails } = await v.readJson<{ emails?: unknown }>(request);
    if (!Array.isArray(emails)) throw new v.InputError("emails 필드가 필요합니다.");
    if (emails.length > 30) throw new v.InputError("메일은 30개까지 등록할 수 있습니다.");

    // 검증 + 소문자 정규화 + 중복 제거
    const list: string[] = [];
    for (const raw of emails) {
      const e = v.email(raw);
      if (!list.includes(e)) list.push(e);
    }

    await setAdminEmails(list);
    return Response.json({ emails: list });
  } catch (error) {
    return v.errorResponse(error, "관리자 메일 저장에 실패했습니다.");
  }
}
