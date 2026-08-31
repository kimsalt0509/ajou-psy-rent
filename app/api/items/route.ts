import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createItem, getItemsWithStock } from "@/lib/store";

export async function GET() {
  const items = await getItemsWithStock();
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  const store = await cookies();
  if (store.get("psy-admin")?.value !== "1") {
    return Response.json(
      { error: "학생회 관리자만 물품을 추가할 수 있습니다." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    emoji?: string;
    total?: number;
    note?: string;
    consumable?: boolean;
  };

  const name = body.name?.trim();
  if (!name)
    return Response.json({ error: "물품 이름을 입력해 주세요." }, { status: 400 });

  const total = Number(body.total);
  if (!Number.isInteger(total) || total < 0)
    return Response.json(
      { error: "보유 수량은 0 이상의 정수여야 합니다." },
      { status: 400 },
    );

  const item = await createItem({
    name,
    emoji: body.emoji?.trim() || "📦",
    total,
    note: body.note?.trim() || "",
    consumable: body.consumable ?? false,
  });
  return Response.json({ item });
}
