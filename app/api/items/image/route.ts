import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { savePhoto } from "@/lib/photos";
import { InputError, errorResponse } from "@/lib/validate";

// 관리자가 물품 사진을 올리는 곳. 저장 후 사진 주소만 돌려주고,
// 실제 물품에 붙이는 것은 물품 추가/수정에서 imageUrl로 처리합니다.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) throw new InputError("사진을 첨부해 주세요.");
    const url = await savePhoto(file, "item");
    return Response.json({ url });
  } catch (error) {
    return errorResponse(error, "사진 업로드에 실패했습니다.");
  }
}
