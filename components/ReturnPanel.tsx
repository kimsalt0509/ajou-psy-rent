"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rental } from "@/lib/types";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { PhotoField } from "./PhotoField";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReturnPanel({ rentals }: { rentals: Rental[] }) {
  const router = useRouter();
  const { user, idToken } = useFirebaseAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rentals;
    return rentals.filter(
      (r) => r.studentId.includes(q) || r.studentName.includes(q),
    );
  }, [query, rentals]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !idToken) return;
    setError("");
    setPending(true);
    const body = new FormData(event.currentTarget);
    const res = await fetch(`/api/rentals/${selected}/return`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body,
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "반납에 실패했습니다.");
      return;
    }
    router.push("/status?done=return");
    router.refresh();
  }

  if (!user) {
    return (
      <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
        반납하려면 먼저{" "}
        <a href="/login" className="underline text-black">
          로그인
        </a>
        해 주세요.
      </p>
    );
  }

  if (rentals.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
        지금 대여 중인 물품이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-black">
          학번 또는 이름 찾기
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="내 학번을 입력하면 내 대여만 보여요"
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-black/10"
        />
      </label>

      <ul className="space-y-2">
        {filtered.map((rental) => {
          const active = selected === rental.id;
          return (
            <li key={rental.id}>
              <button
                type="button"
                onClick={() => setSelected(rental.id)}
                className={`w-full rounded-2xl px-4 py-3 text-left ring-1 transition ${
                  active
                    ? "bg-black text-white ring-black"
                    : "bg-white text-black ring-black/8 hover:ring-black/20"
                }`}
              >
                <p className="font-semibold">
                  {rental.itemName} · {rental.quantity}개
                </p>
                <p
                  className={`text-sm ${active ? "text-white/70" : "text-gray-400"}`}
                >
                  {rental.studentName} ({rental.studentId}) ·{" "}
                  {formatWhen(rental.rentedAt)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-black/8"
        >
          <PhotoField name="photo" label="반납 사진 (물품을 제자리에 둔 모습)" />
          {error ? (
            <p className="rounded-xl bg-pink-50 px-3 py-2 text-sm text-pink-800 ring-1 ring-pink-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-black py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? "반납 중..." : "반납 완료하기"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-400">
          반납할 기록을 위에서 고른 뒤 사진을 찍어 주세요.
        </p>
      )}
    </div>
  );
}
