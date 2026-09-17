import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { savePhoto } from "@/lib/photos";
import { getFaviconUrl, setFaviconUrl } from "@/lib/store";
import { InputError, errorResponse } from "@/lib/validate";

export async function GET() {
  return Response.json({ url: await getFaviconUrl() });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) throw new InputError("파일을 첨부해 주세요.");
    const url = await savePhoto(file, "favicon");
    await setFaviconUrl(url);
    return Response.json({ url });
  } catch (error) {
    return errorResponse(error, "파비콘 업로드에 실패했습니다.");
  }
}
