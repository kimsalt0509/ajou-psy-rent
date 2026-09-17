"use client";

// 업로드 전에 브라우저에서 사진을 줄여서 보냅니다.
// - 휴대폰 원본(5~15MB)이 Vercel 요청 한도(4.5MB)에 걸리는 문제 해결
// - HEIC 등 브라우저가 못 보여주는 형식을 JPEG로 통일
// - 모바일 데이터에서 업로드 속도 개선

const MAX_EDGE = 1600;
const QUALITY = 0.82;
const MAX_BYTES = 4 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

export async function compressImage(file: File): Promise<File> {
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob) throw new Error("encode failed");
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    // 브라우저가 디코딩하지 못하는 형식이면 원본을 그대로 (용량 제한 안이면)
    if (file.size <= MAX_BYTES) return file;
    throw new Error("사진을 처리할 수 없습니다. 카메라 설정을 '높은 호환성(JPG)'으로 바꾸거나 다른 사진을 선택해 주세요.");
  }
}

/** FormData 안의 사진 필드를 압축본으로 교체 */
export async function compressPhotoField(form: FormData, name = "photo"): Promise<void> {
  const value = form.get(name);
  if (value instanceof File && value.size > 0) {
    const compressed = await compressImage(value);
    form.set(name, compressed, compressed.name);
  }
}
