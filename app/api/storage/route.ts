import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createStorageItem, getStorageItems } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }
  const storage = await getStorageItems();
  return NextResponse.json({ storage });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    emoji?: string;
    quantity?: number;
    note?: string;
  };

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "물품 이름을 입력해 주세요." }, { status: 400 });

  const quantity = Number(body.quantity ?? 0);
  if (!Number.isInteger(quantity) || quantity < 0)
    return NextResponse.json({ error: "수량은 0 이상의 정수여야 합니다." }, { status: 400 });

  const item = await createStorageItem({
    name,
    emoji: body.emoji?.trim() || "📦",
    quantity,
    note: body.note?.trim() || "",
  });
  return NextResponse.json({ item });
}
