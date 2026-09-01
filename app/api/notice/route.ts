import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getNotice, setNotice } from "@/lib/store";

export async function GET() {
  const content = await getNotice();
  return NextResponse.json({ content });
}

export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }
  const { content } = (await request.json()) as { content?: string };
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content 필드가 필요합니다." }, { status: 400 });
  }
  await setNotice(content);
  return NextResponse.json({ ok: true });
}
