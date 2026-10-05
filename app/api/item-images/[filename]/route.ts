import { NextRequest } from "next/server";
import { readPhoto } from "@/lib/photos";

// 물품 사진은 학생도 봐야 하므로 공개. 단, 관리자가 올린 물품 사진(item-...)만 허용하고
// 대여·반납 사진(rent-, return-)은 절대 내보내지 않습니다.
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/item-images/[filename]">,
) {
  const { filename } = await ctx.params;
  const name = decodeURIComponent(filename);
  if (!name.startsWith("item-")) return new Response("Not found", { status: 404 });

  try {
    const photo = await readPhoto(name);
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(photo.buffer), {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[item-images] read failed", error);
    return new Response("Error", { status: 500 });
  }
}
