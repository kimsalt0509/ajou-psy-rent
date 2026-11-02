/**
 * 대여 물품 사진 등록 (파일명 = 물품명)
 *
 * 미리보기:  node scripts/upload-item-images.mjs
 * 실제 적용: node scripts/upload-item-images.mjs --apply
 *
 * items만 imageUrl 갱신. rentals는 건드리지 않음.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomBytes } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { basename, extname, join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
const PHOTO_DIR =
  process.argv.find((a) => a.startsWith("--dir="))?.slice("--dir=".length) ??
  "C:\\Users\\kgr44\\Documents\\카카오톡 받은 파일\\과방 물품 사진\\과방 물품 사진";

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
const bucket = getStorage().bucket();
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ??
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

const files = readdirSync(PHOTO_DIR)
  .filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f))
  .map((f) => ({
    file: f,
    path: join(PHOTO_DIR, f),
    name: basename(f, extname(f)),
  }));

const snap = await db.collection("items").get();
const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const byName = new Map(items.map((i) => [i.name, i]));

const matched = [];
const unmatchedFiles = [];

for (const f of files) {
  const item = byName.get(f.name);
  if (item) matched.push({ ...f, item });
  else unmatchedFiles.push(f);
}

const unmatchedItems = items.filter((i) => !matched.some((m) => m.item.id === i.id));

console.log(APPLY ? "\n🖼  물품 사진 등록 — APPLY\n" : "\n🖼  물품 사진 등록 — DRY-RUN\n");
console.log("매칭된 파일:");
for (const m of matched) {
  console.log(`  ✓  ${m.file}  →  items/${m.item.id}  (${m.item.name})`);
}
if (unmatchedFiles.length) {
  console.log("\n파일명과 같은 대여 물품이 없어 건너뜀:");
  for (const f of unmatchedFiles) console.log(`  ·  ${f.file}`);
}
if (unmatchedItems.length) {
  console.log("\n사진이 없는 대여 물품:");
  for (const i of unmatchedItems) console.log(`  ·  ${i.name}`);
}

if (!APPLY) {
  console.log("\n실제 등록: node scripts/upload-item-images.mjs --apply");
  process.exit(0);
}

for (const m of matched) {
  const buffer = readFileSync(m.path);
  const name = `item-${Date.now()}-${randomBytes(6).toString("hex")}.jpg`;
  const path = `uploads/${name}`;
  await bucket.file(path).save(buffer, {
    metadata: { contentType: "image/jpeg", cacheControl: "private, max-age=86400" },
    resumable: false,
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(path)}?alt=media`;
  await db.collection("items").doc(m.item.id).update({ imageUrl: url });
  console.log(`  ✅  ${m.item.name}  ←  ${path}`);
}

console.log(`\n완료: ${matched.length}개 등록`);
