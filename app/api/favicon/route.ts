import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { savePhoto } from "@/lib/photos";
import { getFaviconUrl, setFaviconUrl } from "@/lib/store";

export async function GET() {
  const url = await getFaviconUrl();
  return NextResponse.json({ url });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일을 첨부해 주세요." }, { status: 400 });
  }

  const url = await savePhoto(file, "favicon");
  await setFaviconUrl(url);

  return NextResponse.json({ url });
}
