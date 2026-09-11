import { getFaviconUrl } from "@/lib/store";

export const dynamic = "force-dynamic";

// size/contentType export를 제거 — metadata의 icons.icon: "/icon" 이 직접 참조

export default async function Icon() {
  const url = await getFaviconUrl();

  if (!url) {
    // 기본: 빈 1x1 투명 PNG
    const transparent1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    return new Response(transparent1x1, {
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
