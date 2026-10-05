/**
 * 수량 동기화 스크립트 (2026년 9월 기준)
 * 원본 문서: docs/inventory-2026-09.md
 *
 * 미리보기:  node scripts/sync-quantities.mjs
 * 실제 적용: node scripts/sync-quantities.mjs --apply
 *
 * 규칙:
 *  - items: total 만 수정. name/emoji/note/consumable/dueDays/variants 절대 건드리지 않음
 *  - 돗자리는 완전 제외
 *  - storage: 이름 있으면 quantity 만 수정 (note·emoji 유지), 없으면 신규 추가
 *  - rentals 컬렉션 절대 건드리지 않음
 *  - 기본 실행은 미리보기만 (--apply 시 저장)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env.local 파싱 ─────────────────────────────────────────────────────────────
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

// ── Firebase Admin 초기화 ───────────────────────────────────────────────────────
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

// ── 목표 수량 데이터 ────────────────────────────────────────────────────────────

// items: total 목표값 (돗자리 제외)
const ITEMS_TOTAL = {
  "우산":          9,
  "렌즈통":        3,
  "인공눈물":      30,
  "밴드 (일반)":   44,
  "밴드 (작은 것)": 4,
  "면봉":          19,
  "생리대":        6,
  "타이레놀":      0,
};

// storage: quantity 목표값 (없으면 신규 추가, 이때 note·emoji 사용)
const STORAGE_QUANTITY = [
  { name: "면봉",                   quantity:  2, emoji: "🧴", note: "120개 개별포장 1통 + 500개입 1통" },
  { name: "밴드",                   quantity:  1, emoji: "🩹", note: "110매입 1통 (약품통 밴드 소진 시 통째로 이동)" },
  { name: "박스테이프",             quantity:  4, emoji: "📦", note: "재고칸 투명 3 + 학용품통 1" },
  { name: "볼펜",                   quantity: 18, emoji: "🖊️", note: "재고칸 18(6개 + 12개입) · 필통 비치분은 개수 안 셈" },
  { name: "보드마카",               quantity: 14, emoji: "🖍️", note: "재고칸 11 + 필통 3 (이름표 부착)" },
  { name: "가위",                   quantity:  1, emoji: "✂️", note: "필통 1 · 재고칸 수량 미기재" },
  { name: "물티슈",                 quantity:  1, emoji: "🧻", note: "약품통 옆 1 + 재고칸 0 · 매월 첫 주에만 보충" },
  { name: "휴지",                   quantity:  2, emoji: "🧻", note: "약품통 옆 1 + 재고칸 1 · 매월 첫 주에만 보충" },
  { name: "충전기 (C타입)",         quantity:  1, emoji: "🔌", note: "과방 비치 (콘센트 옆) · 사용 후 A4용지 선반 위에 정리" },
  { name: "충전기 (8핀)",           quantity:  1, emoji: "🔌", note: "과방 비치 (콘센트 옆) · 사용 후 A4용지 선반 위에 정리" },
  { name: "멀티탭",                 quantity:  1, emoji: "🔌", note: "과방 비치 (A4용지 책장) · 고장 시 연락" },
  { name: "연고",                   quantity:  1, emoji: "🩹", note: "약품통 · 다 쓰면 구매 담당자에게 연락" },
  { name: "탈지면",                 quantity:  0, emoji: "🧴", note: "약품통 · 보충X · 수량 미기재" },
  { name: "사인펜",                 quantity:  1, emoji: "🖍️", note: "학용품통 · 보충X" },
  { name: "색연필",                 quantity:  2, emoji: "🖍️", note: "학용품통 · 보충X" },
  { name: "스테이플러",             quantity:  1, emoji: "📎", note: "학용품통 · 심과 함께 있음 · 보충X" },
  { name: "스테이플러심",           quantity:  0, emoji: "📎", note: "매달 한 번 체크 · 수량 미기재 — 확인 필요" },
  { name: "클립",                   quantity:  0, emoji: "📎", note: "학용품통 · 보충X · 수량 미기재" },
  { name: "집게",                   quantity:  0, emoji: "📎", note: "보충X · 수량 미기재" },
  { name: "화이트보드",             quantity:  5, emoji: "📋", note: "학과 행사 전용 (대여X)" },
  { name: "만보기",                 quantity:  0, emoji: "👟", note: "학과 행사 전용 (대여X)" },
  { name: "양말",                   quantity:  0, emoji: "🧦", note: "대여X" },
  { name: "부착형 걸이",            quantity:  0, emoji: "🪝", note: "과방 정리용 (대여X)" },
  { name: "심리학과 이름표 스티커", quantity:  0, emoji: "🏷️", note: "수량 미기재 — 확인 필요" },
  { name: "생리대",                 quantity:  0, emoji: "🌸", note: "재고칸 · 수량 미기재 — 확인 필요" },
];

// ── 유틸 ────────────────────────────────────────────────────────────────────────

function printTable(rows, cols) {
  if (rows.length === 0) return;
  const widths = cols.map((c) =>
    Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? "").length))
  );
  const sep = cols.map((_, i) => "─".repeat(widths[i])).join("─┼─");
  console.log("┌─" + sep + "─┐");
  console.log("│ " + cols.map((c, i) => c.label.padEnd(widths[i])).join(" │ ") + " │");
  console.log("├─" + sep + "─┤");
  for (const row of rows) {
    console.log("│ " + cols.map((c, i) => String(row[c.key] ?? "").padEnd(widths[i])).join(" │ ") + " │");
  }
  console.log("└─" + sep + "─┘");
}

// ── 메인 ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📦  수량 동기화 스크립트 — ${APPLY ? "🟢 APPLY 모드" : "🔵 DRY-RUN 모드"}\n`);

  // ── 0. 현재 storage 전체 목록 출력 ───────────────────────────────────────────
  console.log("━━━ 현재 storage 문서 목록 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const storageSnap = await db.collection("storage").orderBy("name").get();
  const storageMap = new Map(); // name → { id, data }
  const storageRows = [];
  for (const doc of storageSnap.docs) {
    const d = doc.data();
    storageMap.set(d.name, { id: doc.id, data: d });
    storageRows.push({ name: d.name, qty: String(d.quantity ?? 0), note: d.note ?? "" });
  }
  if (storageRows.length === 0) {
    console.log("  (비어 있음)");
  } else {
    printTable(storageRows, [
      { key: "name", label: "이름" },
      { key: "qty",  label: "수량" },
      { key: "note", label: "비고" },
    ]);
  }
  console.log(`  총 ${storageRows.length}개 문서\n`);

  // ── 1. items 처리 ─────────────────────────────────────────────────────────────
  console.log("━━━ items 수량 동기화 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const itemsSnap = await db.collection("items").get();
  const itemRows = [];
  let itemUpdate = 0, itemSkip = 0, itemNotFound = 0;

  for (const [name, targetTotal] of Object.entries(ITEMS_TOTAL)) {
    const doc = itemsSnap.docs.find((d) => d.data().name === name);
    if (!doc) {
      itemRows.push({ action: "❓ 없음", name, current: "-", target: String(targetTotal), reason: "DB에 없음 — 확인 필요" });
      itemNotFound++;
      continue;
    }
    const current = doc.data().total ?? 0;
    if (current === targetTotal) {
      itemRows.push({ action: "건너뜀", name, current: String(current), target: String(targetTotal), reason: "변경 없음" });
      itemSkip++;
    } else {
      itemRows.push({ action: "수정", name, current: String(current), target: String(targetTotal), reason: `${current} → ${targetTotal}` });
      itemUpdate++;
      if (APPLY) {
        await doc.ref.update({ total: targetTotal });
      }
    }
  }

  printTable(itemRows, [
    { key: "action",  label: "동작" },
    { key: "name",    label: "이름" },
    { key: "current", label: "현재" },
    { key: "target",  label: "목표" },
    { key: "reason",  label: "비고" },
  ]);
  console.log(`  → 수정 ${itemUpdate}개 / 건너뜀 ${itemSkip}개${itemNotFound ? ` / 없음 ${itemNotFound}개` : ""}\n`);

  // ── 2. storage 처리 ───────────────────────────────────────────────────────────
  console.log("━━━ storage 수량 동기화 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const now = new Date().toISOString();
  const stRows = [];
  let stUpdate = 0, stAdd = 0, stSkip = 0;

  for (const item of STORAGE_QUANTITY) {
    const existing = storageMap.get(item.name);
    if (!existing) {
      // 신규 추가 (이때만 note·emoji 사용)
      stRows.push({ action: "추가", name: item.name, current: "-", target: String(item.quantity), reason: "신규" });
      stAdd++;
      if (APPLY) {
        await db.collection("storage").add({
          name: item.name,
          emoji: item.emoji,
          quantity: item.quantity,
          note: item.note,
          updatedAt: now,
        });
      }
    } else {
      const current = existing.data.quantity ?? 0;
      if (current === item.quantity) {
        stRows.push({ action: "건너뜀", name: item.name, current: String(current), target: String(item.quantity), reason: "변경 없음" });
        stSkip++;
      } else {
        stRows.push({ action: "수정", name: item.name, current: String(current), target: String(item.quantity), reason: `${current} → ${item.quantity}` });
        stUpdate++;
        if (APPLY) {
          await existing.id && db.collection("storage").doc(existing.id).update({
            quantity: item.quantity,
            updatedAt: now,
          });
        }
      }
    }
  }

  printTable(stRows, [
    { key: "action",  label: "동작" },
    { key: "name",    label: "이름" },
    { key: "current", label: "현재" },
    { key: "target",  label: "목표" },
    { key: "reason",  label: "비고" },
  ]);
  console.log(`  → 추가 ${stAdd}개 / 수정 ${stUpdate}개 / 건너뜀 ${stSkip}개\n`);

  // ── 3. 요약 ───────────────────────────────────────────────────────────────────
  const total = itemUpdate + stAdd + stUpdate;
  console.log("━".repeat(72));
  if (APPLY) {
    console.log(`✅ 완료: items 수정 ${itemUpdate}개 / storage 추가 ${stAdd} 수정 ${stUpdate}개 — 총 ${total}건 저장`);
  } else {
    console.log(`🔵 미리보기: items 수정 ${itemUpdate}개 / storage 추가 ${stAdd} 수정 ${stUpdate}개 — 총 ${total}건 예정`);
    console.log("   실제 저장하려면:  node scripts/sync-quantities.mjs --apply");
  }
  console.log();
}

main().catch((err) => {
  console.error("❌ 오류:", err);
  process.exit(1);
});
