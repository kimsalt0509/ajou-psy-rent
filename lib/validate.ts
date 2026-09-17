// 서버 입력 검증 헬퍼

export class InputError extends Error {}

export function str(
  value: unknown,
  label: string,
  { min = 0, max = 200 }: { min?: number; max?: number } = {},
): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min)
    throw new InputError(min <= 1 ? `${label}을(를) 입력해 주세요.` : `${label}을(를) 정확히 입력해 주세요.`);
  if (s.length > max) throw new InputError(`${label}은(는) ${max}자 이하로 입력해 주세요.`);
  return s;
}

export function int(
  value: unknown,
  label: string,
  { min = 0, max = 100000 }: { min?: number; max?: number } = {},
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new InputError(`${label}은(는) ${min} 이상 ${max} 이하의 정수여야 합니다.`);
  return n;
}

export function studentId(value: unknown): string {
  const s = str(value, "학번", { min: 1, max: 10 });
  if (!/^\d{6,10}$/.test(s)) throw new InputError("학번은 숫자 6~10자리로 입력해 주세요.");
  return s;
}

/** 휴대폰 번호 → 010-1234-5678 형태로 정규화 */
export function phone(value: unknown): string {
  const digits = (typeof value === "string" ? value : "").replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits))
    throw new InputError("휴대폰 번호를 정확히 입력해 주세요. (예: 010-1234-5678)");
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function errorResponse(error: unknown, fallback: string, status = 400) {
  if (error instanceof InputError)
    return Response.json({ error: error.message }, { status });
  // 내부 오류 메시지는 노출하지 않고 로그로만 남김
  console.error(`[api] ${fallback}`, error);
  return Response.json({ error: fallback }, { status: 500 });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new InputError("요청 형식이 올바르지 않습니다.");
  }
}
