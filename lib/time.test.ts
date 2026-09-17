// 실행: npm test  (Node 22.6+ 의 타입 제거 기능 사용)
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDueDate, daysOverdue, formatKST, isOverdue, kstDateKey } from "./time.ts";

const kst = (s: string) => new Date(`${s}+09:00`);

test("반납 기한은 KST 기준 N일 뒤 23:59:59.999", () => {
  // 9/10 15:00 KST 대여, 3일 → 9/13 23:59:59.999 KST
  assert.equal(computeDueDate(kst("2026-09-10T15:00:00"), 3), "2026-09-13T14:59:59.999Z");
  // 자정 직후(00:30 KST, UTC로는 전날)도 KST 날짜 기준
  assert.equal(computeDueDate(kst("2026-09-10T00:30:00"), 1), "2026-09-11T14:59:59.999Z");
});

test("기한 당일 밤까지는 초과 아님, 다음날 0시부터 초과", () => {
  const due = computeDueDate(kst("2026-09-10T15:00:00"), 3);
  assert.equal(isOverdue(due, kst("2026-09-13T23:59:00")), false);
  assert.equal(isOverdue(due, kst("2026-09-14T00:00:00")), true);
  assert.equal(isOverdue(null), false);
});

test("예전 형식 기한(대여 시각+72시간)도 그날 자정까지 유예", () => {
  const legacy = kst("2026-09-13T15:00:00").toISOString();
  assert.equal(isOverdue(legacy, kst("2026-09-13T20:00:00")), false);
  assert.equal(isOverdue(legacy, kst("2026-09-14T00:00:01")), true);
});

test("경과 일수: 기한 다음날 = 1일 (0일 경과 메일 방지)", () => {
  const due = computeDueDate(kst("2026-09-10T15:00:00"), 3);
  assert.equal(daysOverdue(due, kst("2026-09-14T09:00:00")), 1);
  assert.equal(daysOverdue(due, kst("2026-09-20T09:00:00")), 7);
  assert.equal(daysOverdue(due, kst("2026-09-13T09:00:00")), 0);
});

test("KST 날짜 키와 포맷", () => {
  assert.equal(kstDateKey(new Date("2026-09-16T15:30:00Z")), "2026-09-17");
  assert.match(formatKST("2026-09-16T15:30:00Z", "date"), /2026\D+9\D+17/);
});
