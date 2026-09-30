/**
 * 과방 물품 등록 스크립트 (2026년 9월 기준)
 * 원본 문서: docs/inventory-2026-09.md
 *
 * 미리보기:  node scripts/seed-inventory.mjs
 * 실제 적용: node scripts/seed-inventory.mjs --apply
 *
 * 규칙:
 *  - name으로 매칭: 있으면 수정, 없으면 추가
 *  - rentals 컬렉션은 절대 건드리지 않음
 *  - 이 문서에 없는 기존 물품은 삭제하지 않고 목록만 출력
 *  - dueDays는 변경하지 않음 (문서에 값 없음)
 *  - 소모품 total = targetRemaining + 현재 반납 안 된 대여 수량
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env.local 파싱 ────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const APPLY = process.argv.includes("--apply");

// ── Firebase Admin 초기화 ──────────────────────────────────────────────────────
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

// ── 등록할 데이터 (docs/inventory-2026-09.md §6 기계용 데이터) ─────────────────

/** 일반 대여품 + 소모품. 소모품은 targetRemaining 으로 total 계산 */
const ITEMS_DATA = [
  // ── 반납하는 물품 ─────────────────────────────────────────────────────────────
  { name: "우산",   emoji: "☔", total: 9, note: "사용 후 까먹지 말고 반납",             consumable: false },
  { name: "돗자리", emoji: "🧺", total: 2, note: "큰 것 1개 / 작은 것 1개",               consumable: false },
  { name: "렌즈통", emoji: "👓", total: 3, note: "사용 후 약품통에 다시 넣어주세요",       consumable: false },

  // ── 소모품 (targetRemaining 으로 total 계산) ───────────────────────────────────
  { name: "인공눈물",     emoji: "👁️", targetRemaining: 30, note: "약품통 (A4책장 옆 책장)",              consumable: true },
  { name: "밴드 (일반)",  emoji: "🩹", targetRemaining: 44, note: "약품통 (A4책장 옆 책장)",              consumable: true },
  { name: "밴드 (작은 것)", emoji: "🩹", targetRemaining: 4,  note: "약품통 (A4책장 옆 책장)",            consumable: true },
  { name: "면봉",         emoji: "🧴", targetRemaining: 19, note: "약품통 (개별포장)",                   consumable: true },
  { name: "생리대",       emoji: "🌸", targetRemaining:  6, note: "약품통 (A4책장 옆 책장)",              consumable: true },
  { name: "타이레놀",     emoji: "💊", targetRemaining:  0, note: "약품통 · 소진 시 학생회에 알려주세요", consumable: true },
];

/** 창고 물품 */
const STORAGE_DATA = [
  { name: "면봉",                   emoji: "🧴", quantity:  2, note: "120개 개별포장 1통 + 500개입 1통" },
  { name: "밴드",                   emoji: "🩹", quantity:  1, note: "110매입 1통 (약품통 밴드 소진 시 통째로 이동)" },
  { name: "박스테이프",             emoji: "📦", quantity:  4, note: "재고칸 투명 3 + 학용품통 1" },
  { name: "볼펜",                   emoji: "🖊️", quantity: 18, note: "재고칸 18(6개 + 12개입) · 필통 비치분은 개수 안 셈" },
  { name: "보드마카",               emoji: "🖍️", quantity: 14, note: "재고칸 11 + 필통 3 (이름표 부착)" },
  { name: "가위",                   emoji: "✂️", quantity:  1, note: "필통 1 · 재고칸 수량 미기재" },
  { name: "물티슈",                 emoji: "🧻", quantity:  1, note: "약품통 옆 1 + 재고칸 0 · 매월 첫 주에만 보충" },
  { name: "휴지",                   emoji: "🧻", quantity:  2, note: "약품통 옆 1 + 재고칸 1 · 매월 첫 주에만 보충" },
  { name: "충전기 (C타입)",         emoji: "🔌", quantity:  1, note: "과방 비치 (콘센트 옆) · 사용 후 A4용지 선반 위에 정리" },
  { name: "충전기 (8핀)",           emoji: "🔌", quantity:  1, note: "과방 비치 (콘센트 옆) · 사용 후 A4용지 선반 위에 정리" },
  { name: "멀티탭",                 emoji: "🔌", quantity:  1, note: "과방 비치 (A4용지 책장) · 고장 시 연락" },
  { name: "연고",                   emoji: "🩹", quantity:  1, note: "약품통 · 다 쓰면 구매 담당자에게 연락" },
  { name: "탈지면",                 emoji: "🧴", quantity:  0, note: "약품통 · 보충X · 수량 미기재" },
  { name: "사인펜",                 emoji: "🖍️", quantity:  1, note: "학용품통 · 보충X" },
  { name: "색연필",                 emoji: "🖍️", quantity:  2, note: "학용품통 · 보충X" },
  { name: "스테이플러",             emoji: "📎", quantity:  1, note: "학용품통 · 심과 함께 있음 · 보충X" },
  { name: "스테이플러심",           emoji: "📎", quantity:  0, note: "매달 한 번 체크 · 수량 미기재 — 확인 필요" },
  { name: "클립",                   emoji: "📎", quantity:  0, note: "학용품통 · 보충X · 수량 미기재" },
  { name: "집게",                   emoji: "📎", quantity:  0, note: "보충X · 수량 미기재" },
  { name: "화이트보드",             emoji: "📋", quantity:  5, note: "학과 행사 전용 (대여X)" },
  { name: "만보기",                 emoji: "👟", quantity:  0, note: "학과 행사 전용 (대여X)" },
  { name: "양말",                   emoji: "🧦", quantity:  0, note: "대여X" },
  { name: "부착형 걸이",            emoji: "🪝", quantity:  0, note: "과방 정리용 (대여X)" },
  { name: "심리학과 이름표 스티커", emoji: "🏷️", quantity:  0, note: "수량 미기재 — 확인 필요" },
  { name: "생리대",                 emoji: "🌸", quantity:  0, note: "재고칸 · 수량 미기재 — 확인 필요" },
];

// ── 유틸 ───────────────────────────────────────────────────────────────────────

/** 소모품별 returnedAt == null 인 대여 수량 합계를 반환 */
async function getUnreturnedCount(itemId) {
  const snap = await db
    .collection("rentals")
    .where("itemId", "==", itemId)
    .where("returnedAt", "==", null)
    .get();
  return snap.docs.reduce((sum, d) => sum + (d.data().quantity ?? 1), 0);
}

/** 컬렉션 전체 문서를 name → {id, data} 맵으로 반환 */
async function fetchByName(collection) {
  const snap = await db.collection(collection).get();
  const map = new Map();
  for (const doc of snap.docs) {
    map.set(doc.data().name, { id: doc.id, data: doc.data() });
  }
  return map;
}

// 표 출력 헬퍼
function printTable(rows, cols) {
  const widths = cols.map((c) =>
    Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? "").length))
  );
  const sep = cols.map((c, i) => "─".repeat(widths[i])).join("─┼─");
  const header = cols.map((c, i) => c.label.padEnd(widths[i])).join(" │ ");
  console.log("┌─" + sep + "─┐");
  console.log("│ " + header + " │");
  console.log("├─" + sep + "─┤");
  for (const row of rows) {
    const line = cols.map((c, i) => String(row[c.key] ?? "").padEnd(widths[i])).join(" │ ");
    console.log("│ " + line + " │");
  }
  console.log("└─" + sep + "─┘");
}

// ── 메인 ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🗂  과방 물품 시드 스크립트 — ${APPLY ? "🟢 APPLY 모드" : "🔵 DRY-RUN 모드"}\n`);

  // ── items 처리 ────────────────────────────────────────────────────────────────
  console.log("━━━ items 컬렉션 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const existingItems = await fetchByName("items");
  const itemRows = [];
  let itemAdd = 0, itemUpdate = 0, itemSkip = 0;

  for (const item of ITEMS_DATA) {
    const existing = existingItems.get(item.name);

    // 소모품: total 계산
    let computedTotal = item.total ?? null;
    let unreturnedCount = 0;
    if (item.consumable) {
      if (existing) {
        unreturnedCount = await getUnreturnedCount(existing.id);
      }
      computedTotal = item.targetRemaining + unreturnedCount;
    }

    // 변경할 필드 결정 (dueDays는 건드리지 않음)
    const patch = {
      name:       item.name,
      emoji:      item.emoji,
      total:      computedTotal,
      note:       item.note,
      consumable: item.consumable,
    };

    let action, reason;
    if (!existing) {
      action = "추가";
      reason = "신규";
    } else {
      // 실제로 달라진 필드가 있는지 확인
      const d = existing.data;
      const changed =
        d.emoji      !== patch.emoji      ||
        d.total      !== patch.total      ||
        d.note       !== patch.note       ||
        (d.consumable ?? false) !== patch.consumable;

      if (changed) {
        action = "수정";
        const diffs = [];
        if (d.total !== patch.total)
          diffs.push(`total: ${d.total}→${patch.total}${item.consumable ? ` (미반납 ${unreturnedCount}개)` : ""}`);
        if (d.emoji !== patch.emoji)       diffs.push(`emoji: ${d.emoji}→${patch.emoji}`);
        if (d.note  !== patch.note)        diffs.push("note 변경");
        if ((d.consumable ?? false) !== patch.consumable)
          diffs.push(`consumable: ${d.consumable}→${patch.consumable}`);
        reason = diffs.join(", ");
      } else {
        action = "건너뜀";
        reason = "변경 없음";
      }
    }

    itemRows.push({
      action,
      name:  item.name,
      emoji: item.emoji,
      total: String(computedTotal),
      consumable: item.consumable ? "✓" : "",
      reason,
    });

    if (action === "추가")   itemAdd++;
    else if (action === "수정") itemUpdate++;
    else                     itemSkip++;

    if (APPLY) {
      if (action === "추가") {
        await db.collection("items").add(patch);
      } else if (action === "수정") {
        await db.collection("items").doc(existing.id).update(patch);
      }
    }
  }

  printTable(itemRows, [
    { key: "action",     label: "동작" },
    { key: "name",       label: "이름" },
    { key: "emoji",      label: "이모지" },
    { key: "total",      label: "total" },
    { key: "consumable", label: "소모품" },
    { key: "reason",     label: "비고" },
  ]);
  console.log(`  → 추가 ${itemAdd}개 / 수정 ${itemUpdate}개 / 건너뜀 ${itemSkip}개\n`);

  // 이 문서에 없는 기존 물품 표시
  const registeredItemNames = new Set(ITEMS_DATA.map((i) => i.name));
  const unknownItems = [...existingItems.keys()].filter((n) => !registeredItemNames.has(n));
  if (unknownItems.length) {
    console.log("⚠️  이 문서에 없는 기존 items (삭제하지 않음):");
    unknownItems.forEach((n) => console.log(`   • ${n}`));
    console.log();
  }

  // ── storage 처리 ──────────────────────────────────────────────────────────────
  console.log("━━━ storage 컬렉션 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const existingStorage = await fetchByName("storage");
  const storageRows = [];
  let stAdd = 0, stUpdate = 0, stSkip = 0;
  const now = new Date().toISOString();

  for (const item of STORAGE_DATA) {
    const existing = existingStorage.get(item.name);

    const patch = {
      name:      item.name,
      emoji:     item.emoji,
      quantity:  item.quantity,
      note:      item.note,
      updatedAt: now,
    };

    let action, reason;
    if (!existing) {
      action = "추가";
      reason = "신규";
    } else {
      const d = existing.data;
      const changed =
        d.emoji    !== patch.emoji    ||
        d.quantity !== patch.quantity ||
        d.note     !== patch.note;

      if (changed) {
        action = "수정";
        const diffs = [];
        if (d.quantity !== patch.quantity) diffs.push(`quantity: ${d.quantity}→${patch.quantity}`);
        if (d.emoji    !== patch.emoji)    diffs.push(`emoji: ${d.emoji}→${patch.emoji}`);
        if (d.note     !== patch.note)     diffs.push("note 변경");
        reason = diffs.join(", ");
      } else {
        action = "건너뜀";
        reason = "변경 없음";
      }
    }

    storageRows.push({
      action,
      name:     item.name,
      emoji:    item.emoji,
      quantity: String(item.quantity),
      reason,
    });

    if (action === "추가")    stAdd++;
    else if (action === "수정") stUpdate++;
    else                      stSkip++;

    if (APPLY) {
      if (action === "추가") {
        await db.collection("storage").add(patch);
      } else if (action === "수정") {
        await db.collection("storage").doc(existing.id).update(patch);
      }
    }
  }

  printTable(storageRows, [
    { key: "action",   label: "동작" },
    { key: "name",     label: "이름" },
    { key: "emoji",    label: "이모지" },
    { key: "quantity", label: "quantity" },
    { key: "reason",   label: "비고" },
  ]);
  console.log(`  → 추가 ${stAdd}개 / 수정 ${stUpdate}개 / 건너뜀 ${stSkip}개\n`);

  // 이 문서에 없는 기존 창고 물품 표시
  const registeredStorageNames = new Set(STORAGE_DATA.map((i) => i.name));
  const unknownStorage = [...existingStorage.keys()].filter((n) => !registeredStorageNames.has(n));
  if (unknownStorage.length) {
    console.log("⚠️  이 문서에 없는 기존 storage (삭제하지 않음):");
    unknownStorage.forEach((n) => console.log(`   • ${n}`));
    console.log();
  }

  // ── 최종 요약 ─────────────────────────────────────────────────────────────────
  const total = itemAdd + itemUpdate + stAdd + stUpdate;
  console.log("━".repeat(72));
  if (APPLY) {
    console.log(`✅ 완료: items(+${itemAdd} ~${itemUpdate}) storage(+${stAdd} ~${stUpdate}) — 총 ${total}건 저장`);
  } else {
    console.log(`🔵 미리보기 완료: items(+${itemAdd} ~${itemUpdate}) storage(+${stAdd} ~${stUpdate}) — 총 ${total}건 예정`);
    console.log("   실제 저장하려면:  node scripts/seed-inventory.mjs --apply");
  }
  console.log();
}

main().catch((err) => {
  console.error("❌ 오류:", err);
  process.exit(1);
});
