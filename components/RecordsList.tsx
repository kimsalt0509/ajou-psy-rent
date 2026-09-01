"use client";

import { useState } from "react";
import type { Rental } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(dueDate: string | null, returnedAt: string | null) {
  return !!dueDate && !returnedAt && new Date(dueDate) < new Date();
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

export function RecordsList({ rentals }: { rentals: Rental[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const activeCount = rentals.filter((r) => !r.returnedAt).length;
  const overdueCount = rentals.filter((r) => isOverdue(r.dueDate, r.returnedAt)).length;

  return (
    <>
      {lightbox ? <LightBox src={lightbox} onClose={() => setLightbox(null)} /> : null}

      <p className="text-sm text-gray-400">
        전체 {rentals.length}건 · 대여 중 {activeCount}건
        {overdueCount > 0 ? ` · ⚠️ 기한 초과 ${overdueCount}건` : ""}
      </p>

      {rentals.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          아직 대여 기록이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {rentals.map((rental) => {
            const overdue = isOverdue(rental.dueDate, rental.returnedAt);
            return (
              <li
                key={rental.id}
                className={`rounded-2xl p-4 ring-1 ${overdue ? "bg-red-50 ring-red-200" : "bg-white ring-black/8"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-black">
                    {rental.studentName} ({rental.studentId}) · {rental.phone}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    {overdue ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
                        기한 초과
                      </span>
                    ) : null}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      rental.returnedAt
                        ? "bg-gray-100 text-gray-500"
                        : "bg-pink-50 text-pink-700 ring-1 ring-pink-200"
                    }`}>
                      {rental.returnedAt ? "반납" : "대여 중"}
                    </span>
                  </div>
                </div>
                <p className="mt-0.5 text-sm text-gray-600">
                  {rental.itemName} · {rental.quantity}개
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  대여 {formatWhen(rental.rentedAt)}
                  {rental.dueDate ? ` · 반납 기한 ${formatWhen(rental.dueDate)}` : ""}
                </p>
                {rental.returnedAt ? (
                  <p className="text-xs text-gray-400">반납 {formatWhen(rental.returnedAt)}</p>
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
            );
          })}
        </ul>
      )}
    </>
  );
}
