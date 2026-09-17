import { randomBytes } from "crypto";
import { bucket } from "./firebase-admin";
import { MAX_PHOTO_BYTES } from "./config";
import { InputError } from "./validate";

type Detected = { ext: string; contentType: string };

/** 파일 앞부분(매직 바이트)으로 실제 이미지 형식 판별 — 클라이언트가 보낸 type은 믿지 않음 */
function detectImage(buf: Buffer): Detected | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { ext: "jpg", contentType: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: "png", contentType: "image/png" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { ext: "webp", contentType: "image/webp" };
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand))
      return { ext: "heic", contentType: "image/heic" };
    if (/^avi[fs]$/.test(brand)) return { ext: "avif", contentType: "image/avif" };
  }
  return null;
}

/**
 * 사진을 Storage에 저장하고, 기존 레코드와 호환되는 Firebase Storage URL을 반환합니다.
 * 화면에서는 photoSrc()로 변환해 관리자 전용 프록시(/api/photos/…)를 통해 봅니다.
 */
export async function savePhoto(file: File, prefix: string): Promise<string> {
  if (!file || file.size === 0) throw new InputError("사진을 첨부해 주세요.");
  if (file.size > MAX_PHOTO_BYTES)
    throw new InputError("사진 용량이 너무 큽니다. (최대 4MB)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImage(buffer);
  if (!detected) throw new InputError("JPG·PNG·WebP·HEIC 이미지만 업로드할 수 있습니다.");

  const name = `${prefix}-${Date.now()}-${randomBytes(6).toString("hex")}.${detected.ext}`;
  const path = `uploads/${name}`;

  await bucket().file(path).save(buffer, {
    metadata: { contentType: detected.contentType, cacheControl: "private, max-age=86400" },
    resumable: false,
  });

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(path)}?alt=media`;
}

export async function readPhoto(filename: string) {
  if (!/^[\w.-]+$/.test(filename) || filename.startsWith(".")) return null;
  const file = bucket().file(`uploads/${filename}`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [[buffer], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
  return { buffer, contentType: meta.contentType ?? "application/octet-stream" };
}

/** 저장된 URL의 파일 삭제 (보관기간 만료 정리용) */
export async function deletePhotoByUrl(url: string): Promise<void> {
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return;
  const path = decodeURIComponent(m[1]);
  if (!path.startsWith("uploads/") || path.includes("..")) return;
  await bucket().file(path).delete({ ignoreNotFound: true });
}
