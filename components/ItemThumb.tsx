"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { itemImageSrc } from "@/lib/photo-src";
import { LightBox } from "./LightBox";

/**
 * 물품 사진 썸네일 — 누르면 크게 보입니다.
 * 사진이 없으면 아무것도 그리지 않으므로, 이모지 대체 표시는 쓰는 쪽에서 처리합니다.
 * LightBox는 포털로 body에 띄워서 <p>·<li> 안에서도 레이아웃이 깨지지 않습니다.
 * 마운트 시 원본 이미지를 미리 받아 두어 클릭 즉시 열립니다.
 */
export function ItemThumb({
  url,
  alt = "",
  className = "",
}: {
  url: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const src = itemImageSrc(url);

  // 썸네일이 화면에 보이는 순간 원본도 백그라운드에서 미리 로드 → 클릭 즉시 캐시에서 표시
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, [src]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        title="크게 보기"
        aria-label={alt ? `${alt} 크게 보기` : "사진 크게 보기"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`${className} overflow-hidden cursor-zoom-in transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-black/40`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <LightBox src={src} alt={alt || "물품 사진"} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}
