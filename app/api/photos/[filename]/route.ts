import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readPhoto } from "@/lib/photos";

// 대여·반납 사진은 관리자만 볼 수 있도록 서버를 거쳐 전달합니다.
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/photos/[filename]">,
) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const { filename } = await ctx.params;
  try {
    const photo = await readPhoto(decodeURIComponent(filename));
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(photo.buffer), {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[photos] read failed", error);
    return new Response("Error", { status: 500 });
  }
}
