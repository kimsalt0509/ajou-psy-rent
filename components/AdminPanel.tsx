"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemWithStock, Rental } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR");
}

export function AdminPanel({
  items,
  rentals,
}: {
  items: ItemWithStock[];
  rentals: Rental[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    const body = {
      name: String(fd.get("name") ?? ""),
      emoji: String(fd.get("emoji") ?? ""),
      total: Number(fd.get("total")),
      note: String(fd.get("note") ?? ""),
      consumable: fd.get("consumable") === "on",
    };
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "추가에 실패했습니다.");
      return;
    }
    form.reset();
    router.refresh();
  }

  async function toggleConsumable(id: string, current: boolean) {
    setError("");
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumable: !current }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "수정에 실패했습니다.");
    } else {
      router.refresh();
    }
  }

  async function saveTotal(id: string, total: number) {
    setError("");
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "수정에 실패했습니다.");
    } else {
      router.refresh();
    }
  }

  async function deleteItem(id: string, name: string) {
    if (!confirm(`"${name}"을(를) 정말 삭제할까요?`)) return;
    setError("");
    setDeletingId(id);
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    setDeletingId(null);
    if (!res.ok) {
      setError(data.error ?? "삭제에 실패했습니다.");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-xl bg-pink-50 px-4 py-3 text-sm text-pink-800 ring-1 ring-pink-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
        <h2 className="font-bold text-black">물품 목록</h2>
        <p className="mt-1 text-sm text-gray-400">
          수량 변경은 숫자를 수정하면 자동 저장됩니다.
        </p>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm font-medium text-black">
                {item.emoji} {item.name}
              </span>
              <input
                type="number"
                min={item.rented}
                defaultValue={item.total}
                className="w-16 rounded-xl bg-gray-100 px-2 py-2 text-sm text-black"
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value !== item.total) saveTotal(item.id, value);
                }}
              />
              <button
                type="button"
                onClick={() => toggleConsumable(item.id, !!item.consumable)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  item.consumable
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                소모품
              </button>
              <button
                type="button"
                onClick={() => deleteItem(item.id, item.name)}
                disabled={deletingId === item.id}
                className="ml-auto rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-500 hover:bg-pink-50 hover:text-pink-700 disabled:opacity-40 transition"
              >
                {deletingId === item.id ? "삭제 중..." : "삭제"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
        <h2 className="font-bold text-black">물품 추가</h2>
        <form onSubmit={addItem} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="이름"
            className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400"
          />
          <input
            name="emoji"
            placeholder="이모지 (☔)"
            className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400"
          />
          <input
            name="total"
            type="number"
            min={0}
            defaultValue={1}
            required
            placeholder="보유 수량"
            className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400"
          />
          <input
            name="note"
            placeholder="비고 (어디에 두는지)"
            className="rounded-xl bg-gray-100 px-3 py-2 text-black placeholder-gray-400"
          />
          <label className="flex items-center gap-2 px-1 sm:col-span-2">
            <input
              type="checkbox"
              name="consumable"
              className="h-4 w-4 rounded accent-amber-500"
            />
            <span className="text-sm text-gray-600">
              소모품 (인공눈물 등 — 재고에서 대여 중 표시 없이 남은 수만 표시)
            </span>
          </label>
          <button className="rounded-xl bg-black py-2 text-sm font-semibold text-white hover:bg-gray-800 transition sm:col-span-2">
            추가
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-black">최근 대여 기록</h2>
        <ul className="space-y-2">
          {rentals.slice(0, 40).map((rental) => (
            <li
              key={rental.id}
              className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/8"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-black">
                  {rental.studentName} ({rental.studentId}) · {rental.itemName}{" "}
                  {rental.quantity}개
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    rental.returnedAt
                      ? "bg-gray-100 text-gray-500"
                      : "bg-pink-50 text-pink-700 ring-1 ring-pink-200"
                  }`}
                >
                  {rental.returnedAt ? "반납" : "대여 중"}
                </span>
              </div>
              <p className="mt-1 text-gray-400">대여 {formatWhen(rental.rentedAt)}</p>
              {rental.returnedAt ? (
                <p className="text-gray-400">반납 {formatWhen(rental.returnedAt)}</p>
              ) : null}
              <div className="mt-2 flex gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rental.rentPhoto}
                  alt="대여 사진"
                  className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/8"
                />
                {rental.returnPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rental.returnPhoto}
                    alt="반납 사진"
                    className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/8"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
