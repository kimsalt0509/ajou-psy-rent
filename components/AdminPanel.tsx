"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemWithStock } from "@/lib/types";

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
  notice: initialNotice = "",
  faviconUrl: initialFaviconUrl = null,
}: {
  items: ItemWithStock[];
  notice?: string;
  faviconUrl?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState(initialNotice);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(initialFaviconUrl);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconSaved, setFaviconSaved] = useState(false);

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

  async function uploadFavicon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    setFaviconSaved(false);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/favicon", { method: "POST", body: fd });
    setFaviconUploading(false);
    if (res.ok) {
      const data = (await res.json()) as { url: string };
      setFaviconUrl(data.url);
      setFaviconSaved(true);
      setTimeout(() => setFaviconSaved(false), 2000);
      router.refresh();
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "파비콘 업로드에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-8">
      {lightbox ? <LightBox src={lightbox} onClose={() => setLightbox(null)} /> : null}

      {/* 관리자 가이드 */}
      <section className="rounded-3xl bg-gray-900 p-5 text-white space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">관리자 가이드</p>
          <h2 className="mt-1 text-base font-bold">처음 사용하신다면 읽어보세요</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-sm font-semibold">📦 관리 탭 (현재 페이지)</p>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              대여 물품을 추가·삭제하고 보유 수량을 조절합니다. 공지사항을 입력하면 대여 페이지 상단에 표시됩니다. 탭 아이콘도 여기서 변경할 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-sm font-semibold">📊 현황 탭</p>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              지금 대여 중인 물품을 품목별로 확인합니다. 반납 기한이 지난 학생은 빨간색으로 상단에 표시됩니다. 소모품은 표시되지 않습니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-sm font-semibold">🏭 창고 탭</p>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              구매해서 창고에 보관 중인 비축 물품을 관리합니다. &ldquo;재고로 이동&rdquo; 버튼으로 창고 수량을 줄이고 대여 가능한 재고를 늘릴 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-sm font-semibold">📋 기록 탭</p>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              모든 대여·반납 기록을 조회합니다. 사진을 클릭하면 크게 볼 수 있고, 학번·연락처도 확인할 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 sm:col-span-2">
            <p className="text-sm font-semibold">🔄 반납 탭 (관리자 전용 기능)</p>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              관리자로 로그인하면 반납 탭에서 학번·이름으로 다른 사람의 대여 기록을 검색하고 대신 반납 처리할 수 있습니다.
            </p>
          </div>
        </div>
        <p className="text-xs text-white/30">
          관리자 비밀번호를 바꾸려면 개발자에게 문의하세요.
        </p>
      </section>

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
        <h2 className="font-bold text-black">탭 아이콘 (파비콘)</h2>
        <p className="mt-1 text-sm text-gray-400">
          브라우저 탭에 표시되는 아이콘입니다. PNG · JPG · WebP (권장 크기: 64×64 이상 정사각형)
        </p>
        <div className="mt-3 flex items-center gap-4">
          {faviconUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={faviconUrl}
              alt="현재 파비콘"
              className="h-12 w-12 rounded-xl object-contain ring-1 ring-black/10"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl ring-1 ring-black/8">
              🖼️
            </div>
          )}
          <label className="cursor-pointer rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition">
            {faviconUploading ? "업로드 중..." : faviconSaved ? "변경됨 ✓" : "이미지 선택"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadFavicon}
              disabled={faviconUploading}
            />
          </label>
        </div>
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
    </div>
  );
}
