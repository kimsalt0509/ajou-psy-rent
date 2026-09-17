// 담당자·문구 등 운영 설정 — 담당자가 바뀌면 환경변수만 바꾸면 됩니다.
export const CONTACT = {
  label: process.env.NEXT_PUBLIC_CONTACT_LABEL ?? "심리학과 부학생회장 김가람",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "010-6409-3370",
};

export const SERVICE_NAME = "아주대학교 심리학과 학생회 물품 대여 시스템";

/** 반납 완료 후 대여 기록 보관 기간(일). 미설정 시 자동 삭제하지 않음 */
export const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 0) || 0;

/** 업로드 가능한 사진 최대 크기 — Vercel 요청 본문 한도(4.5MB)보다 작게 */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
