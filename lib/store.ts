import { db } from "./firebase-admin";
import type { Item, ItemWithStock, Rental } from "./types";

const ITEMS = "items";
const RENTALS = "rentals";

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
  for (const item of DEFAULT_ITEMS) {
    const { id, ...data } = item;
    batch.set(db().collection(ITEMS).doc(id), data);
  }
  await batch.commit();
  seeded = true;
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function getItems(): Promise<Item[]> {
  await maybeSeed();
  const snap = await db().collection(ITEMS).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) }));
}

export async function createItem(
  data: Omit<Item, "id">,
): Promise<Item> {
  await maybeSeed();
  const ref = await db().collection(ITEMS).add(data);
  return { id: ref.id, ...data };
}

export async function updateItem(
  id: string,
  data: Partial<Omit<Item, "id">>,
): Promise<void> {
  await db().collection(ITEMS).doc(id).update(data);
}

export async function deleteItem(id: string): Promise<void> {
  await db().collection(ITEMS).doc(id).delete();
}

// ─── Rentals ─────────────────────────────────────────────────────────────────

export async function getRentals(filters?: {
  studentId?: string;
  activeOnly?: boolean;
}): Promise<Rental[]> {
  // Firestore requires a composite index when combining where() on one field
  // with orderBy() on a different field. To avoid the index requirement,
  // apply orderBy only when no filters are active, and sort in-memory otherwise.
  const hasFilter = filters?.activeOnly || filters?.studentId;
  let query: FirebaseFirestore.Query = db().collection(RENTALS);

  if (filters?.activeOnly) {
    query = query.where("returnedAt", "==", null);
  }
  if (filters?.studentId) {
    query = query.where("studentId", "==", filters.studentId);
  }
  if (!hasFilter) {
    query = query.orderBy("rentedAt", "desc");
  }

  const snap = await query.get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Rental, "id">) }));

  if (hasFilter) {
    docs.sort((a, b) => new Date(b.rentedAt).getTime() - new Date(a.rentedAt).getTime());
  }

  return docs;
}

export async function getActiveRentalCountForItem(itemId: string): Promise<number> {
  const snap = await db()
    .collection(RENTALS)
    .where("itemId", "==", itemId)
    .where("returnedAt", "==", null)
    .get();
  return snap.docs.reduce((sum, d) => sum + ((d.data().quantity as number) ?? 1), 0);
}

export async function createRental(
  data: Omit<Rental, "id">,
): Promise<Rental> {
  // 트랜잭션으로 재고 초과 방지
  const rentalRef = db().collection(RENTALS).doc();

  await db().runTransaction(async (tx) => {
    const itemDoc = await tx.get(db().collection(ITEMS).doc(data.itemId));
    if (!itemDoc.exists) throw new Error("물품을 찾을 수 없습니다.");

    const item = { id: itemDoc.id, ...(itemDoc.data() as Omit<Item, "id">) };

    // 현재 대여 중인 수량 집계 (트랜잭션 밖에서 조회 — 간단 버전)
    const activeSnap = await db()
      .collection(RENTALS)
      .where("itemId", "==", item.id)
      .where("returnedAt", "==", null)
      .get();
    const rented = activeSnap.docs.reduce(
      (s, d) => s + ((d.data().quantity as number) ?? 1),
      0,
    );
    const remaining = item.total - rented;

    if (data.quantity > remaining) {
      throw new Error(
        `${item.name}은(는) 지금 ${remaining}개만 대여할 수 있습니다.`,
      );
    }

    tx.set(rentalRef, data);
  });

  return { id: rentalRef.id, ...data };
}

export async function completeReturn(
  id: string,
  returnData: { returnPhoto: string; returnedAt: string },
): Promise<Rental> {
  const ref = db().collection(RENTALS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("대여 기록을 찾을 수 없습니다.");

  const rental = { id: snap.id, ...(snap.data() as Omit<Rental, "id">) };
  if (rental.returnedAt) throw new Error("이미 반납된 기록입니다.");

  await ref.update(returnData);
  return { ...rental, ...returnData };
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function getItemsWithStock(): Promise<ItemWithStock[]> {
  const [items, activeRentals] = await Promise.all([
    getItems(),
    getRentals({ activeOnly: true }),
  ]);

  return items.map((item) => {
    const rented = activeRentals
      .filter((r) => r.itemId === item.id)
      .reduce((s, r) => s + r.quantity, 0);
    return { ...item, rented, remaining: Math.max(0, item.total - rented) };
  });
}
