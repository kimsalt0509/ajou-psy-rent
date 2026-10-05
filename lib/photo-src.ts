// 클라이언트·서버 공용: 저장된 Storage URL → 관리자 전용 사진 프록시 경로
export function photoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  const path = decodeURIComponent(m[1]);
  if (!path.startsWith("uploads/")) return null;
  return `/api/photos/${encodeURIComponent(path.slice("uploads/".length))}`;
}

/** 물품 사진(관리자가 등록) — 학생도 볼 수 있는 공개 경로 */
export function itemImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  const path = decodeURIComponent(m[1]);
  if (!path.startsWith("uploads/item-")) return null;
  return `/api/item-images/${encodeURIComponent(path.slice("uploads/".length))}`;
}
