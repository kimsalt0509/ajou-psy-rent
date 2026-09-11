"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StorageRow = { id: string; name: string; emoji: string; quantity: number; note: string };
type ItemRow = { id: string; name: string; emoji: string; total: number };

export default function StoragePage() {
  const router = useRouter();
  const [storageItems, setStorageItems] = useState<StorageRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 창고→재고 이동 팝업
  const [moveTarget, setMoveTarget] = useState<StorageRow | null>(null);
  const [moveItemId, setMoveItemId] = useState("");
  const [moveQty, setMoveQty] = useState(1);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/storage").then((r) => r.json()),
      fetch("/api/items").then((r) => r.json()),
    ]).then(([s, i]: [{ storage?: StorageRow[] }, { items?: ItemRow[] }]) => {
      if (s.storage) setStorageItems(s.storage);
      if (i.items) setItems(i.items);
      setLoading(false);
    });
  }, []);

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? "").trim(),
      emoji: String(fd.get("emoji") ?? "").trim() || "📦",
      quantity: Number(fd.get("quantity") ?? 0),
      note: String(fd.get("note") ?? "").trim(),
    };
    if (!body.name) { setError("물품 이름을 입력해 주세요."); return; }
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = (await res.json()) as { item?: StorageRow };
      if (data.item) setStorageItems((prev) => [...prev, data.item!]);
      (e.target as HTMLFormElement).reset();
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "추가에 실패했습니다.");
    }
  }

  async function updateQty(id: string, quantity: number) {
    const res = await fetch(`/api/storage/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "수정에 실패했습니다.");
    } else {
      setStorageItems((prev) => prev.map((s) => s.id === id ? { ...s, quantity } : s));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"을(를) 창고에서 삭제할까요?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/storage/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setStorageItems((prev) => prev.filter((s) => s.id !== id));
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "삭제에 실패했습니다.");
    }
  }

  async function moveToStock() {
    if (!moveTarget || !moveItemId || moveQty <= 0) return;
    setMoving(true);
    setError("");
    try {
      const targetItem = items.find((i) => i.id === moveItemId);
      if (!targetItem) throw new Error("재고 물품을 찾을 수 없습니다.");

      // 1) 재고 total 증가
      const res = await fetch(`/api/items/${moveItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total: targetItem.total + moveQty }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "재고 수정에 실패했습니다.");
      }

      // 2) 창고 차감
      const newStorageQty = Math.max(0, moveTarget.quantity - moveQty);
      await fetch(`/api/storage/${moveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newStorageQty }),
      });

      setStorageItems((prev) =>
        prev.map((s) => s.id === moveTarget.id ? { ...s, quantity: newStorageQty } : s)
      );
      setItems((prev) =>
        prev.map((i) => i.id === moveItemId ? { ...i, total: i.total + moveQty } : i)
      );
      setMoveTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "이동에 실패했습니다.");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-black">창고</h2>
        <p className="mt-1 text-sm text-gray-400">
          비축 물품을 관리합니다. &ldquo;재고로 이동&rdquo; 버튼으로 직접 선택해서 재고에 반영하세요.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-pink-50 px-4 py-3 text-sm text-pink-800 ring-1 ring-pink-200">{error}</p>
      ) : null}

      {/* 재고로 이동 모달 */}
      {moveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-black">재고로 이동</h3>
            <p className="text-sm text-gray-500">
              창고 <strong>{moveTarget.emoji} {moveTarget.name}</strong> (현재 {moveTarget.quantity}개)에서
              몇 개를 어느 재고 물품으로 이동할까요?
            </p>
            <select
              value={moveItemId}
              onChange={(e) => setMoveItemId(e.target.value)}
              className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-black"
            >
              <option value="">재고 물품 선택</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.emoji} {i.name} (현재 {i.total}개)</option>
              ))}
            </select>
            <div>
              <label className="mb-1 block text-sm text-gray-500">이동할 수량</label>
              <input
                type="number"
                min={1}
                max={moveTarget.quantity}
                value={moveQty}
                onChange={(e) => setMoveQty(Number(e.target.value))}
                className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-black"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={moveToStock}
                disabled={moving || !moveItemId || moveQty <= 0}
                className="flex-1 rounded-2xl bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {moving ? "이동 중..." : "이동하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 창고 물품 목록 */}
      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
        <h3 className="font-bold text-black">창고 물품 목록</h3>
        {loading ? (
          <p className="mt-3 text-sm text-gray-400">불러오는 중...</p>
        ) : storageItems.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">등록된 창고 물품이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {storageItems.map((s) => (
              <li key={s.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-xl shrink-0">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">{s.name}</p>
                  {s.note ? <p className="text-[11px] text-gray-400">{s.note}</p> : null}
                </div>
                <input
                  type="number"
                  min={0}
                  defaultValue={s.quantity}
                  key={`qty-${s.id}-${s.quantity}`}
                  className="w-16 rounded-xl bg-gray-100 px-2 py-2 text-sm text-center text-black shrink-0"
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val !== s.quantity) updateQty(s.id, val);
                  }}
                />
                <span className="text-xs text-gray-400 shrink-0">개</span>
                <button
                  type="button"
                  onClick={() => { setMoveTarget(s); setMoveItemId(""); setMoveQty(1); }}
                  disabled={s.quantity === 0}
                  className="shrink-0 rounded-xl bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-30 transition"
                >
                  재고로 이동
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id, s.name)}
                  disabled={deletingId === s.id}
                  className="shrink-0 rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-500 hover:bg-pink-50 hover:text-pink-700 disabled:opacity-40 transition"
                >
                  {deletingId === s.id ? "..." : "삭제"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 창고 물품 추가 */}
      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
        <h3 className="font-bold text-black">창고 물품 추가</h3>
        <form onSubmit={addItem} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="물품 이름" className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400" />
          <input name="emoji" placeholder="이모지 (📦)" className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400" />
          <input name="quantity" type="number" min={0} defaultValue={0} placeholder="수량" className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400" />
          <input name="note" placeholder="비고" className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400" />
          <button className="rounded-xl bg-black py-2 text-sm font-semibold text-white hover:bg-gray-800 transition sm:col-span-2">
            추가
          </button>
        </form>
      </section>
    </div>
  );
}
