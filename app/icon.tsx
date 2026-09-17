import { getFaviconUrl } from "@/lib/store";
import { readPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// 1x1 투명 PNG
const TRANSPARENT = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function fallback() {
  return new Response(new Uint8Array(TRANSPARENT), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
  });
}

export default async function Icon() {
  try {
    const url = await getFaviconUrl();
    const m = url?.match(/\/o\/uploads%2F([^?]+)/);
    if (!m) return fallback();

    // Storage를 비공개로 바꿔도 동작하도록 서버 권한으로 직접 읽음
    const photo = await readPhoto(decodeURIComponent(m[1]));
    if (!photo) return fallback();

    return new Response(new Uint8Array(photo.buffer), {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[icon] failed", error);
    return fallback();
  }
}
