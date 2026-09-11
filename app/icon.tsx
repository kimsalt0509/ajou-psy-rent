import { ImageResponse } from "next/og";
import { getFaviconUrl } from "@/lib/store";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Icon() {
  const url = await getFaviconUrl();

  if (!url) {
    // 기본 아이콘 (파비콘 미설정 시)
    return new ImageResponse(
      (
        <div
          style={{
            width: 64,
            height: 64,
            background: "black",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 32,
          }}
        >
          📦
        </div>
      ),
      size,
    );
  }

  // 업로드된 이미지를 fetch해서 반환
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
