/**
 * 대여 기록 초기화 스크립트 (테스트 데이터 제거용, 일회성)
 *
 * 미리보기:  node scripts/reset-rentals.mjs
 * 실제 적용: node scripts/reset-rentals.mjs --apply
 *
 * --apply 시 동작:
 *   1) rentals 전체를 backup/rentals-YYYYMMDD-HHmmss.json 에 로컬 백업
 *   2) rentals 컬렉션 전체 문서 삭제
 *   3) 각 대여의 rentPhoto / returnPhoto 가 가리키는 Storage 파일 삭제
 *      (uploads/rent-*, uploads/return-* 만 삭제 — uploads/favicon-* 절대 건드리지 않음)
 *
 * 건드리지 않는 것: items, storage, users, notices, settings, 그 외 컬렉션 일체
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
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
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});
const db = getFirestore();
const storageBucketRef = getStorage().bucket();

// ── 헬퍼 ───────────────────────────────────────────────────────────────────────

/**
 * Firebase Storage URL 또는 gs:// URI에서 uploads/ 경로를 추출합니다.
 * 파비콘(uploads/favicon-*) 경로는 null 을 반환해 보호합니다.
 */
function extractUploadPath(url) {
  if (!url) return null;

  let path = null;

  // https://firebasestorage.googleapis.com/v0/b/.../o/uploads%2F...?alt=media
  const httpMatch = url.match(/\/o\/([^?]+)/);
  if (httpMatch) {
    path = decodeURIComponent(httpMatch[1]);
  }

  // gs://bucket/uploads/...
  const gsMatch = url.match(/^gs:\/\/[^/]+\/(.+)$/);
  if (gsMatch) {
    path = gsMatch[1];
  }

  if (!path) return null;

  // uploads/ 하위 파일만 허용
  if (!path.startsWith("uploads/")) return null;
  // 경로 탈출 방지
  if (path.includes("..")) return null;

  const filename = path.slice("uploads/".length);

  // 파비콘 보호 — 절대 삭제하지 않음
  if (filename.startsWith("favicon-")) return null;

  // 대여/반납 사진만 삭제 (rent-* / return-*)
  if (!filename.startsWith("rent-") && !filename.startsWith("return-")) {
    console.warn(`  ⚠️  예상치 못한 파일 경로, 건너뜀: ${path}`);
    return null;
  }

  return path;
}

/** Firestore 문서를 500개씩 배치 삭제 */
async function batchDelete(docs) {
  const CHUNK = 500;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log(`  Firestore 삭제 진행 중... ${Math.min(i + CHUNK, docs.length)}/${docs.length}`);
  }
}

// ── 메인 ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🗑  대여 기록 초기화 스크립트 — ${APPLY ? "🔴 APPLY 모드" : "🔵 DRY-RUN 모드"}\n`);

  // ── 1. rentals 전체 조회 ──────────────────────────────────────────────────────
  console.log("Firestore rentals 컬렉션 읽는 중...");
  const snap = await db.collection("rentals").get();
  const docs = snap.docs;
  const total = docs.length;

  if (total === 0) {
    console.log("✅ rentals 컬렉션이 이미 비어 있습니다.\n");
    return;
  }

  // 대여 중 / 반납 완료 분류
  let activeCount = 0;
  let returnedCount = 0;
  const photoPathSet = new Set();

  for (const doc of docs) {
    const d = doc.data();
    if (d.returnedAt == null) {
      activeCount++;
    } else {
      returnedCount++;
    }

    // 사진 경로 수집
    const rentPath = extractUploadPath(d.rentPhoto);
    const returnPath = extractUploadPath(d.returnPhoto);
    if (rentPath)   photoPathSet.add(rentPath);
    if (returnPath) photoPathSet.add(returnPath);
  }

  const photoPaths = [...photoPathSet];

  // ── 2. 미리보기 출력 ──────────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────┐");
  console.log("│              rentals 초기화 예정 내역              │");
  console.log("├─────────────────────────────────────────────────┤");
  console.log(`│  rentals 문서 합계      ${String(total).padStart(4)}개                  │`);
  console.log(`│    · 대여 중 (미반납)   ${String(activeCount).padStart(4)}개                  │`);
  console.log(`│    · 반납 완료          ${String(returnedCount).padStart(4)}개                  │`);
  console.log(`│  Storage 사진 파일      ${String(photoPaths.length).padStart(4)}개                  │`);
  console.log("└─────────────────────────────────────────────────┘");

  // 대여 중 항목 상세 목록
  if (activeCount > 0) {
    console.log("\n📋 대여 중(미반납) 항목:");
    for (const doc of docs) {
      const d = doc.data();
      if (d.returnedAt == null) {
        console.log(`   • [${doc.id}] ${d.itemName} × ${d.quantity ?? 1} — ${d.studentName} (${d.studentId})`);
      }
    }
  }

  if (!APPLY) {
    console.log("\n🔵 미리보기 완료. 실제 삭제하려면:");
    console.log("   node scripts/reset-rentals.mjs --apply\n");
    return;
  }

  // ── 3. 로컬 백업 ──────────────────────────────────────────────────────────────
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const backupDir  = resolve(__dirname, "../backup");
  const backupFile = resolve(backupDir, `rentals-${timestamp}.json`);

  mkdirSync(backupDir, { recursive: true });
  const backupData = docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  writeFileSync(backupFile, JSON.stringify(backupData, null, 2), "utf-8");
  console.log(`\n💾 백업 완료: ${backupFile}`);

  // ── 4. Firestore rentals 삭제 ─────────────────────────────────────────────────
  console.log(`\n🗑  Firestore: rentals ${total}개 삭제 중...`);
  await batchDelete(docs);
  console.log(`✅ Firestore rentals ${total}개 삭제 완료`);

  // ── 5. Storage 사진 삭제 ──────────────────────────────────────────────────────
  if (photoPaths.length === 0) {
    console.log("\nℹ️  삭제할 Storage 파일 없음");
  } else {
    console.log(`\n🗑  Storage: 사진 ${photoPaths.length}개 삭제 중...`);
    let deletedCount = 0;
    let skippedCount = 0;
    for (const path of photoPaths) {
      try {
        await storageBucketRef.file(path).delete({ ignoreNotFound: true });
        deletedCount++;
        console.log(`   ✓ ${path}`);
      } catch (err) {
        skippedCount++;
        console.warn(`   ✗ ${path} — ${err.message}`);
      }
    }
    console.log(`✅ Storage 사진 ${deletedCount}개 삭제 완료${skippedCount ? ` (오류 ${skippedCount}개)` : ""}`);
  }

  // ── 6. 최종 요약 ──────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ 초기화 완료`);
  console.log(`   · rentals 삭제: ${total}개`);
  console.log(`   · 사진 삭제:    ${photoPaths.length}개`);
  console.log(`   · 백업 파일:    ${backupFile}`);
  console.log();
}

main().catch((err) => {
  console.error("❌ 오류:", err);
  process.exit(1);
});
