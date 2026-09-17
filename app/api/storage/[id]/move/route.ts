import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { moveStorageToItem } from "@/lib/store";
import * as v from "@/lib/validate";

// 창고 → 대여 재고 이동 (한 트랜잭션에서 처리)
export async function POST(request: NextRequest, ctx: RouteContext<"/api/storage/[id]/move">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const body = await v.readJson(request);
    const result = await moveStorageToItem(
      id,
      v.str(body.itemId, "재고 물품", { min: 1, max: 100 }),
      v.int(body.quantity, "이동 수량", { min: 1, max: 100000 }),
    );
    return Response.json(result);
  } catch (error) {
    return v.errorResponse(error, "이동에 실패했습니다.");
  }
}
