import { getFaviconPhoto } from "@/lib/favicon-photo";

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
    const photo = await getFaviconPhoto();
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
