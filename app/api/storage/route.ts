import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { addToStorage, getItems, getStorageItems } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }
  const [storageItems, items] = await Promise.all([getStorageItems(), getItems()]);

  // 창고에 없는 물품도 quantity: 0으로 포함해서 전체 목록 반환
  const itemMap = new Map(storageItems.map((s) => [s.itemId, s]));
  const full = items.map((item) => {
    const existing = itemMap.get(item.id);
    return existing ?? {
      id: item.id,
      itemId: item.id,
      itemName: item.name,
      emoji: item.emoji,
      quantity: 0,
      updatedAt: "",
    };
  });

  return NextResponse.json({ storage: full });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as { itemId?: string; quantity?: number };
  const { itemId, quantity } = body;

  if (!itemId || !Number.isInteger(quantity) || (quantity as number) <= 0) {
    return NextResponse.json({ error: "itemId와 양수 quantity가 필요합니다." }, { status: 400 });
  }

  const items = await getItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await addToStorage(itemId, quantity as number, { name: item.name, emoji: item.emoji });
  return NextResponse.json({ storage: updated });
}
