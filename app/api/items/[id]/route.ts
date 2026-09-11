import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  deleteItem,
  getActiveRentalCountForItem,
  getItems,
  updateItem,
} from "@/lib/store";

async function requireAdmin() {
  const store = await cookies();
  return store.get("psy-admin")?.value === "1";
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/items/[id]">,
) {
  if (!(await requireAdmin()))
    return Response.json(
      { error: "학생회 관리자만 수정할 수 있습니다." },
      { status: 401 },
    );

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    name?: string;
    emoji?: string;
    total?: number;
    note?: string;
    consumable?: boolean;
  };

  try {
    const items = await getItems();
    const current = items.find((i) => i.id === id);
    if (!current) throw new Error("물품을 찾을 수 없습니다.");

    const patch: Parameters<typeof updateItem>[1] = {};

    if (typeof body.name === "string" && body.name.trim())
      patch.name = body.name.trim();
    if (typeof body.emoji === "string" && body.emoji.trim())
      patch.emoji = body.emoji.trim();
    if (typeof body.note === "string") patch.note = body.note.trim();
    if (typeof body.consumable === "boolean") patch.consumable = body.consumable;

    if (body.total !== undefined) {
      const total = Number(body.total);
      if (!Number.isInteger(total) || total < 0)
        throw new Error("보유 수량은 0 이상의 정수여야 합니다.");
      const rented = await getActiveRentalCountForItem(id);
      if (total < rented)
        throw new Error(
          `지금 ${rented}개가 대여 중이라 ${rented}개 미만으로 줄일 수 없습니다.`,
        );
      patch.total = total;
    }

    await updateItem(id, patch);
    return Response.json({ item: { ...current, ...patch } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "수정에 실패했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/items/[id]">,
) {
  if (!(await requireAdmin()))
    return Response.json(
      { error: "학생회 관리자만 삭제할 수 있습니다." },
      { status: 401 },
    );

  const { id } = await ctx.params;
  try {
    const rented = await getActiveRentalCountForItem(id);
    if (rented > 0)
      throw new Error(
        `지금 ${rented}개가 대여 중입니다. 모두 반납된 후 삭제할 수 있습니다.`,
      );
    await deleteItem(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "삭제에 실패했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}
