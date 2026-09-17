import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createItem, getItemsWithStock } from "@/lib/store";
import * as v from "@/lib/validate";

export async function GET() {
  const items = await getItemsWithStock();
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin("학생회 관리자만 물품을 추가할 수 있습니다.");
  if (denied) return denied;

  try {
    const body = await v.readJson(request);
    const dueDays =
      body.dueDays === undefined || body.dueDays === null || body.dueDays === ""
        ? undefined
        : v.int(body.dueDays, "대여 기간", { min: 1, max: 365 });

    const item = await createItem({
      name: v.str(body.name, "물품 이름", { min: 1, max: 40 }),
      emoji: v.str(body.emoji, "이모지", { max: 16 }) || "📦",
      total: v.int(body.total, "보유 수량", { min: 0, max: 10000 }),
      note: v.str(body.note, "비고", { max: 100 }),
      consumable: body.consumable === true,
      dueDays,
    });
    return Response.json({ item });
  } catch (error) {
    return v.errorResponse(error, "추가에 실패했습니다.");
  }
}
