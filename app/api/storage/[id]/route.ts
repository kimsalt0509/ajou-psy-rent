import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { deleteStorageItem, updateStorageItem } from "@/lib/store";
import * as v from "@/lib/validate";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/storage/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const body = await v.readJson(request);
    const patch: { name?: string; emoji?: string; note?: string; quantity?: number } = {};
    if (typeof body.name === "string" && body.name.trim())
      patch.name = v.str(body.name, "물품 이름", { min: 1, max: 40 });
    if (typeof body.emoji === "string" && body.emoji.trim())
      patch.emoji = v.str(body.emoji, "이모지", { max: 16 });
    if (typeof body.note === "string") patch.note = v.str(body.note, "비고", { max: 100 });
    if (body.quantity !== undefined)
      patch.quantity = v.int(body.quantity, "수량", { min: 0, max: 100000 });

    await updateStorageItem(id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    return v.errorResponse(error, "수정에 실패했습니다.");
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/storage/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    await deleteStorageItem(id);
    return Response.json({ ok: true });
  } catch (error) {
    return v.errorResponse(error, "삭제에 실패했습니다.");
  }
}
