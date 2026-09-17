import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { db } from "./firebase-admin";
import { computeDueDate } from "./time";
import { InputError } from "./validate";
import type { Item, ItemWithStock, Rental, RentalProfile, StorageItem } from "./types";

const ITEMS = "items";
const RENTALS = "rentals";
const STORAGE = "storage";

// ─── Seed ────────────────────────────────────────────────────────────────────

const DEFAULT_ITEMS: Item[] = [
  { id: "umbrella", name: "우산", emoji: "☔", total: 10, note: "과방 입구 우산꽂이" },
  { id: "charger-c", name: "충전기 (C타입)", emoji: "🔌", total: 6, note: "서랍 왼쪽" },
  { id: "charger-8", name: "충전기 (8핀)", emoji: "🔌", total: 6, note: "서랍 왼쪽" },
  { id: "powerbank", name: "보조배터리", emoji: "🔋", total: 4, note: "충전 후 반납" },
  {
    id: "eyedrops",
    name: "인공눈물",
    emoji: "💧",
    total: 20,
    note: "개봉 후 개인 사용이면 학생회에 알려주세요",
  },
];

let seeded = false;

async function maybeSeed() {
  if (seeded) return;
  const snap = await db().collection(ITEMS).limit(1).get();
  if (!snap.empty) {
    seeded = true;
    return;
  }
  const batch = db().batch();
  for (const { id, ...data } of DEFAULT_ITEMS) {
    batch.set(db().collection(ITEMS).doc(id), data);
  }
  await batch.commit();
  seeded = true;
}

function toRental(d: FirebaseFirestore.DocumentSnapshot): Rental {
  return { id: d.id, ...(d.data() as Omit<Rental, "id">) };
}

function activeRentalsQuery(itemId: string) {
  return db().collection(RENTALS).where("itemId", "==", itemId).where("returnedAt", "==", null);
}

function sumQuantity(snap: FirebaseFirestore.QuerySnapshot) {
  return snap.docs.reduce((s, d) => s + ((d.data().quantity as number) ?? 1), 0);
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function getItems(): Promise<Item[]> {
  await maybeSeed();
  const snap = await db().collection(ITEMS).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) }));
}

export async function createItem(data: Omit<Item, "id">): Promise<Item> {
  await maybeSeed();
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Omit<Item, "id">;
  const ref = await db().collection(ITEMS).add(clean);
  return { id: ref.id, ...clean };
}

export type ItemPatch = {
  name?: string;
  emoji?: string;
  note?: string;
  consumable?: boolean;
  dueDays?: number | null; // null = 기간 제한 해제
  total?: number;
};

/** 보유 수량 변경 시 "대여 중 수량보다 작게" 줄이지 못하도록 트랜잭션으로 확인 */
export async function updateItem(id: string, patch: ItemPatch): Promise<Item> {
  const ref = db().collection(ITEMS).doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new InputError("물품을 찾을 수 없습니다.");
    const current = { id, ...(snap.data() as Omit<Item, "id">) };

    if (patch.total !== undefined) {
      const rented = sumQuantity(await tx.get(activeRentalsQuery(id)));
      if (patch.total < rented)
        throw new InputError(
          `지금 ${rented}개가 대여 중이라 ${rented}개 미만으로 줄일 수 없습니다.`,
        );
    }

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      update[k] = k === "dueDays" && v === null ? FieldValue.delete() : v;
    }
    tx.update(ref, update);

    const next: Item = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === "dueDays" && v === null) delete next.dueDays;
      else (next as Record<string, unknown>)[k] = v;
    }
    return next;
  });
}

export async function deleteItem(id: string): Promise<void> {
  const ref = db().collection(ITEMS).doc(id);
  await db().runTransaction(async (tx) => {
    const rented = sumQuantity(await tx.get(activeRentalsQuery(id)));
    if (rented > 0)
      throw new InputError(
        `지금 ${rented}개가 대여 중입니다. 모두 반납된 후 삭제할 수 있습니다.`,
      );
    tx.delete(ref);
  });
}

// ─── Rentals ─────────────────────────────────────────────────────────────────

export async function getRentals(filters?: {
  studentId?: string;
  uid?: string;
  activeOnly?: boolean;
}): Promise<Rental[]> {
  // where + 다른 필드 orderBy 조합은 복합 색인이 필요하므로, 필터가 있으면 메모리에서 정렬
  const hasFilter = !!(filters?.activeOnly || filters?.studentId || filters?.uid);
  let query: FirebaseFirestore.Query = db().collection(RENTALS);

  if (filters?.activeOnly) query = query.where("returnedAt", "==", null);
  if (filters?.studentId) query = query.where("studentId", "==", filters.studentId);
  if (filters?.uid) query = query.where("uid", "==", filters.uid);
  if (!hasFilter) query = query.orderBy("rentedAt", "desc");

  const docs = (await query.get()).docs.map(toRental);
  if (hasFilter) docs.sort((a, b) => b.rentedAt.localeCompare(a.rentedAt));
  return docs;
}

/** 가장 최근 대여에 입력했던 이름·학번·전화번호 (폼 자동 채우기용) */
export async function getLastProfile(uid: string): Promise<RentalProfile | null> {
  const rentals = await getRentals({ uid });
  const last = rentals[0];
  return last
    ? { studentName: last.studentName, studentId: last.studentId, phone: last.phone }
    : null;
}

export type NewRental = Pick<
  Rental,
  "itemId" | "quantity" | "studentId" | "studentName" | "phone" | "uid" | "rentPhoto"
>;

export async function createRental(data: NewRental): Promise<Rental> {
  const rentalRef = db().collection(RENTALS).doc();

  // 트랜잭션 안에서 대여 중 수량까지 읽어야 동시 대여 시 재고 초과가 막힘
  const rental = await db().runTransaction(async (tx) => {
    const itemDoc = await tx.get(db().collection(ITEMS).doc(data.itemId));
    if (!itemDoc.exists) throw new InputError("물품을 찾을 수 없습니다.");
    const item = { id: itemDoc.id, ...(itemDoc.data() as Omit<Item, "id">) };

    const remaining = item.total - sumQuantity(await tx.get(activeRentalsQuery(item.id)));
    if (data.quantity > remaining) {
      throw new InputError(
        remaining > 0
          ? `${item.name}은(는) 지금 ${remaining}개만 대여할 수 있습니다.`
          : `${item.name}은(는) 방금 모두 대여되었습니다.`,
      );
    }

    const now = new Date();
    const record: Omit<Rental, "id"> = {
      ...data,
      itemName: item.name,
      rentedAt: now.toISOString(),
      dueDate: item.dueDays && !item.consumable ? computeDueDate(now, item.dueDays) : null,
      returnedAt: null,
      returnPhoto: null,
    };
    tx.set(rentalRef, record);
    return { id: rentalRef.id, ...record };
  });

  return rental;
}

export async function getRentalById(id: string): Promise<Rental | null> {
  const snap = await db().collection(RENTALS).doc(id).get();
  return snap.exists ? toRental(snap) : null;
}

/** 반납 처리 — 트랜잭션으로 중복 반납(버튼 연타) 방지 */
export async function completeReturn(
  id: string,
  returnData: { returnPhoto: string | null; returnedAt: string; returnedBy: "self" | "admin" },
): Promise<Rental> {
  const ref = db().collection(RENTALS).doc(id);
  return db().runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new InputError("대여 기록을 찾을 수 없습니다.");
    const rental = toRental(snap);
    if (rental.returnedAt) throw new InputError("이미 반납된 기록입니다.");
    tx.update(ref, returnData);
    return { ...rental, ...returnData };
  });
}

/** 연체 알림을 오늘 이미 보냈는지 기록 (크론 재실행 시 중복 발송 방지) */
export async function markOverdueNotified(id: string, dayKey: string): Promise<void> {
  await db().collection(RENTALS).doc(id).update({ overdueNotifiedOn: dayKey });
}

/** 반납 후 보관 기간이 지난 기록과 사진 삭제 */
export async function purgeOldRentals(
  olderThanIso: string,
  deletePhoto: (url: string) => Promise<void>,
): Promise<number> {
  const snap = await db()
    .collection(RENTALS)
    .where("returnedAt", "<", olderThanIso)
    .limit(200)
    .get();
  for (const d of snap.docs) {
    const r = toRental(d);
    for (const url of [r.rentPhoto, r.returnPhoto]) {
      if (url) await deletePhoto(url).catch(() => {});
    }
    await d.ref.delete();
  }
  return snap.size;
}

// ─── Notice ──────────────────────────────────────────────────────────────────

const NOTICE_DOC = "notices/main";

export async function getNotice(): Promise<string> {
  const snap = await db().doc(NOTICE_DOC).get();
  return (snap.data()?.content as string) ?? "";
}

export async function setNotice(content: string): Promise<void> {
  await db().doc(NOTICE_DOC).set({ content, updatedAt: new Date().toISOString() });
}

// ─── Favicon ─────────────────────────────────────────────────────────────────

const FAVICON_DOC = "settings/favicon";

export async function getFaviconUrl(): Promise<string | null> {
  const snap = await db().doc(FAVICON_DOC).get();
  return (snap.data()?.url as string) ?? null;
}

export async function setFaviconUrl(url: string): Promise<void> {
  await db().doc(FAVICON_DOC).set({ url, updatedAt: new Date().toISOString() });
}

// ─── Storage (창고) ──────────────────────────────────────────────────────────

export async function getStorageItems(): Promise<StorageItem[]> {
  const snap = await db().collection(STORAGE).orderBy("name").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StorageItem, "id">) }));
}

export async function createStorageItem(
  data: Omit<StorageItem, "id" | "updatedAt">,
): Promise<StorageItem> {
  const now = new Date().toISOString();
  const ref = await db().collection(STORAGE).add({ ...data, updatedAt: now });
  return { id: ref.id, ...data, updatedAt: now };
}

export async function updateStorageItem(
  id: string,
  data: Partial<Omit<StorageItem, "id" | "updatedAt">>,
): Promise<void> {
  const ref = db().collection(STORAGE).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new InputError("창고 물품을 찾을 수 없습니다.");
  await ref.update({ ...data, updatedAt: new Date().toISOString() });
}

export async function deleteStorageItem(id: string): Promise<void> {
  await db().collection(STORAGE).doc(id).delete();
}

/** 창고 → 대여 재고 이동 (창고 차감 + 재고 증가를 한 번에) */
export async function moveStorageToItem(
  storageId: string,
  itemId: string,
  quantity: number,
): Promise<{ storageQuantity: number; itemTotal: number }> {
  const storageRef = db().collection(STORAGE).doc(storageId);
  const itemRef = db().collection(ITEMS).doc(itemId);
  return db().runTransaction(async (tx) => {
    const [s, i] = await Promise.all([tx.get(storageRef), tx.get(itemRef)]);
    if (!s.exists) throw new InputError("창고 물품을 찾을 수 없습니다.");
    if (!i.exists) throw new InputError("재고 물품을 찾을 수 없습니다.");
    const have = (s.data()!.quantity as number) ?? 0;
    if (quantity > have)
      throw new InputError(`창고에 ${have}개만 있어 ${quantity}개를 옮길 수 없습니다.`);
    const now = new Date().toISOString();
    tx.update(storageRef, { quantity: have - quantity, updatedAt: now });
    tx.update(itemRef, { total: FieldValue.increment(quantity) });
    return {
      storageQuantity: have - quantity,
      itemTotal: ((i.data()!.total as number) ?? 0) + quantity,
    };
  });
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function getItemsWithStock(): Promise<ItemWithStock[]> {
  const [items, activeRentals] = await Promise.all([
    getItems(),
    getRentals({ activeOnly: true }),
  ]);

  const rentedByItem = new Map<string, number>();
  for (const r of activeRentals) {
    rentedByItem.set(r.itemId, (rentedByItem.get(r.itemId) ?? 0) + r.quantity);
  }

  return items
    .map((item) => {
      const rented = rentedByItem.get(item.id) ?? 0;
      return { ...item, rented, remaining: Math.max(0, item.total - rented) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 반납 대상(소모품 제외) 대여 목록 */
export async function getReturnableRentals(filter?: { uid?: string }): Promise<Rental[]> {
  const [rentals, items] = await Promise.all([
    getRentals({ activeOnly: true, uid: filter?.uid }),
    getItems(),
  ]);
  const consumable = new Set(items.filter((i) => i.consumable).map((i) => i.id));
  return rentals.filter((r) => !consumable.has(r.itemId));
}
