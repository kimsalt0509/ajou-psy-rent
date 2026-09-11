import { getFaviconUrl } from "@/lib/store";

export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const url = await getFaviconUrl();

  if (!url) {
    // 파비콘 미설정 시 1x1 투명 PNG
    const transparent = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    return new Response(transparent, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
    });
  }

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
