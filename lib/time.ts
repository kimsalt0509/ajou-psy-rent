// 시간 관련 유틸 — 서버(UTC)와 브라우저(KST) 어디서 실행해도 같은 결과를 내도록
// 모든 계산을 한국 시간(KST, UTC+9, 서머타임 없음) 기준으로 고정합니다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** KST 달력 기준 "몇 번째 날"인지 (1970-01-01 KST = 0) */
function kstDayIndex(date: Date): number {
  return Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS);
}

/** 해당 시각이 속한 KST 날짜의 23:59:59.999 */
export function endOfKstDay(date: Date): Date {
  return new Date((kstDayIndex(date) + 1) * DAY_MS - KST_OFFSET_MS - 1);
}

/** 반납 기한: 대여일(KST)로부터 days일 뒤 23:59:59.999 KST */
export function computeDueDate(rentedAt: Date, days: number): string {
  const end = endOfKstDay(rentedAt);
  return new Date(end.getTime() + days * DAY_MS).toISOString();
}

/**
 * 기한 초과 여부 — 기한 "당일 자정(KST)"이 지나야 초과.
 * 예전 데이터(대여 시각 + N×24시간으로 저장된 기한)도 같은 규칙으로 판정됩니다.
 */
export function isOverdue(
  dueDate: string | null | undefined,
  at: Date | string = new Date(),
): boolean {
  if (!dueDate) return false;
  const now = typeof at === "string" ? new Date(at) : at;
  return now.getTime() > endOfKstDay(new Date(dueDate)).getTime();
}

/** 기한일(KST) 기준 며칠 지났는지. 기한 다음날 = 1 */
export function daysOverdue(dueDate: string, at: Date = new Date()): number {
  return Math.max(0, kstDayIndex(at) - kstDayIndex(new Date(dueDate)));
}

/** KST 기준 YYYY-MM-DD */
export function kstDateKey(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

type Style = "short" | "date" | "datetime";

const FORMATS: Record<Style, Intl.DateTimeFormatOptions> = {
  // 9. 17. 오후 03:20
  short: { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" },
  // 2026년 9월 17일
  date: { year: "numeric", month: "long", day: "numeric" },
  // 2026년 9월 17일 오후 03:20
  datetime: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
};

export function formatKST(iso: string, style: Style = "short"): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    ...FORMATS[style],
  });
}
