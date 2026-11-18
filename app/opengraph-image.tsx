import { ImageResponse } from "next/og";
import { getFaviconPhoto } from "@/lib/favicon-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "심리학과 학생회 대여";
export const size = { width: 800, height: 400 };
export const contentType = "image/png";

/** 링크 공유 미리보기 — 파비콘을 가운데에 크게 넣습니다. */
export default async function OpenGraphImage() {
  const photo = await getFaviconPhoto();

  if (photo) {
    const src = `data:${photo.contentType};base64,${Buffer.from(photo.buffer).toString("base64")}`;
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
          }}
        >
          <img src={src} width={280} height={280} />
        </div>
      ),
      {
        ...size,
        headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
      },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#ffffff",
          fontSize: 36,
          fontWeight: 700,
        }}
      >
        심리학과 학생회 대여
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
    },
  );
}
