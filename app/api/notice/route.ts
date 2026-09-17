import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getNotice, setNotice } from "@/lib/store";
import * as v from "@/lib/validate";

export async function GET() {
  return Response.json({ content: await getNotice() });
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { content } = await v.readJson(request);
    if (typeof content !== "string") throw new v.InputError("content 필드가 필요합니다.");
    await setNotice(v.str(content, "공지", { max: 2000 }));
    return Response.json({ ok: true });
  } catch (error) {
    return v.errorResponse(error, "공지 저장에 실패했습니다.");
  }
}
