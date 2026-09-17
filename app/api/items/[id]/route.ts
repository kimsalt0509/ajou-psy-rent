import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { deleteItem, updateItem, type ItemPatch } from "@/lib/store";
import * as v from "@/lib/validate";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const denied = await requireAdmin("학생회 관리자만 수정할 수 있습니다.");
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const body = await v.readJson(request);
    const patch: ItemPatch = {};

    if (typeof body.name === "string" && body.name.trim())
      patch.name = v.str(body.name, "물품 이름", { min: 1, max: 40 });
    if (typeof body.emoji === "string" && body.emoji.trim())
      patch.emoji = v.str(body.emoji, "이모지", { max: 16 });
    if (typeof body.note === "string") patch.note = v.str(body.note, "비고", { max: 100 });
    if (typeof body.consumable === "boolean") patch.consumable = body.consumable;
    if ("dueDays" in body) {
      patch.dueDays =
        body.dueDays == null || body.dueDays === "" || Number(body.dueDays) <= 0
          ? null
          : v.int(body.dueDays, "대여 기간", { min: 1, max: 365 });
    }
    if (body.total !== undefined)
      patch.total = v.int(body.total, "보유 수량", { min: 0, max: 10000 });

    const item = await updateItem(id, patch);
    return Response.json({ item });
  } catch (error) {
    return v.errorResponse(error, "수정에 실패했습니다.");
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const denied = await requireAdmin("학생회 관리자만 삭제할 수 있습니다.");
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    await deleteItem(id);
    return Response.json({ ok: true });
  } catch (error) {
    return v.errorResponse(error, "삭제에 실패했습니다.");
  }
}
