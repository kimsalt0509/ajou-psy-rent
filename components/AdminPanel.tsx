"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemWithStock, Rental } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR");
}

function LightBox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
      >
        닫기 ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="확대 사진"
        className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function AdminPanel({
  items,
  rentals,
  notice: initialNotice = "",
}: {
  items: ItemWithStock[];
  rentals: Rental[];
  notice?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState(initialNotice);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

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
      ...(fd.get("dueDays") ? { dueDays: Number(fd.get("dueDays")) } : {}),
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

  async function saveNotice() {
    setNoticeSaving(true);
    setNoticeSaved(false);
    const res = await fetch("/api/notice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: notice }),
    });
    setNoticeSaving(false);
    if (res.ok) {
      setNoticeSaved(true);
      setTimeout(() => setNoticeSaved(false), 2000);
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "공지 저장에 실패했습니다.");
    }
  }

  async function adminLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {lightbox ? <LightBox src={lightbox} onClose={() => setLightbox(null)} /> : null}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">관리자 모드</p>
        <button
          type="button"
          onClick={adminLogout}
          className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 transition"
        >
          관리자 나가기
        </button>
      </div>

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
              <div className="w-32 shrink-0">
                <p className="text-sm font-medium text-black">
                  {item.emoji} {item.name}
                </p>
                {item.note ? (
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{item.note}</p>
                ) : null}
              </div>
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
        <h2 className="font-bold text-black">공지 / 주의사항</h2>
        <p className="mt-1 text-sm text-gray-400">
          대여 페이지 상단에 표시됩니다. 반납일, 주의사항 등을 적어주세요.
        </p>
        <textarea
          rows={4}
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="예) 반납 기한: 당일 오후 6시까지&#10;분실 시 변상 책임은 본인에게 있습니다."
          className="mt-3 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-black placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <button
          type="button"
          onClick={saveNotice}
          disabled={noticeSaving}
          className="mt-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {noticeSaving ? "저장 중..." : noticeSaved ? "저장됨 ✓" : "공지 저장"}
        </button>
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
          <input
            name="dueDays"
            type="number"
            min={1}
            placeholder="대여 기간 (일, 선택)"
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
                <div className="flex shrink-0 gap-1">
                  {!rental.returnedAt && rental.dueDate && new Date(rental.dueDate) < new Date() ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
                      기한 초과
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      rental.returnedAt
                        ? "bg-gray-100 text-gray-500"
                        : "bg-pink-50 text-pink-700 ring-1 ring-pink-200"
                    }`}
                  >
                    {rental.returnedAt ? "반납" : "대여 중"}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-gray-400">대여 {formatWhen(rental.rentedAt)}</p>
              {rental.dueDate && !rental.returnedAt ? (
                <p className={`text-xs ${new Date(rental.dueDate) < new Date() ? "text-red-500 font-medium" : "text-gray-400"}`}>
                  반납 기한 {formatWhen(rental.dueDate)}
                </p>
              ) : null}
              {rental.returnedAt ? (
                <p className="text-gray-400">반납 {formatWhen(rental.returnedAt)}</p>
              ) : null}
              <div className="mt-2 flex gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rental.rentPhoto}
                  alt="대여 사진"
                  onClick={() => setLightbox(rental.rentPhoto)}
                  className="h-16 w-16 cursor-pointer rounded-xl object-cover ring-1 ring-black/8 hover:opacity-80 transition"
                />
                {rental.returnPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rental.returnPhoto}
                    alt="반납 사진"
                    onClick={() => setLightbox(rental.returnPhoto!)}
                    className="h-16 w-16 cursor-pointer rounded-xl object-cover ring-1 ring-black/8 hover:opacity-80 transition"
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
