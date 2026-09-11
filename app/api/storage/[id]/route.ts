import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { deleteStorageItem, updateStorageItem } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/storage/[id]">,
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    name?: string;
    emoji?: string;
    quantity?: number;
    note?: string;
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.emoji === "string" && body.emoji.trim()) patch.emoji = body.emoji.trim();
  if (typeof body.note === "string") patch.note = body.note.trim();
  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isInteger(q) || q < 0)
      return NextResponse.json({ error: "수량은 0 이상의 정수여야 합니다." }, { status: 400 });
    patch.quantity = q;
  }

  try {
    await updateStorageItem(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "수정에 실패했습니다.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/storage/[id]">,
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    await deleteStorageItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "삭제에 실패했습니다.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
