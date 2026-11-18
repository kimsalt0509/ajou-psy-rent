import { getFaviconUrl } from "./store";
import { readPhoto } from "./photos";

/** 관리자가 올린 파비콘 파일을 Storage에서 읽습니다. 없으면 null */
export async function getFaviconPhoto() {
  const url = await getFaviconUrl();
  const m = url?.match(/\/o\/uploads%2F([^?]+)/);
  if (!m) return null;
  return readPhoto(decodeURIComponent(m[1]));
}
