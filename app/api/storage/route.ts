import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createStorageItem, getStorageItems } from "@/lib/store";
import * as v from "@/lib/validate";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return Response.json({ storage: await getStorageItems() });
  } catch (error) {
    return v.errorResponse(error, "창고 목록을 불러오지 못했습니다.");
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await v.readJson(request);
    const item = await createStorageItem({
      name: v.str(body.name, "물품 이름", { min: 1, max: 40 }),
      emoji: v.str(body.emoji, "이모지", { max: 16 }) || "📦",
      quantity: v.int(body.quantity ?? 0, "수량", { min: 0, max: 100000 }),
      note: v.str(body.note, "비고", { max: 100 }),
    });
    return Response.json({ item });
  } catch (error) {
    return v.errorResponse(error, "추가에 실패했습니다.");
  }
}
