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

function isOverdue(rental: Rental) {
  return !!rental.dueDate && !rental.returnedAt && new Date(rental.dueDate) < new Date();
}

function RentalCard({
  rental,
  active,
  showStudentId,
  onClick,
}: {
  rental: Rental;
  active: boolean;
  showStudentId: boolean;
  onClick: () => void;
}) {
  const overdue = isOverdue(rental);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-3 text-left ring-1 transition ${
        active
          ? "bg-black text-white ring-black"
          : overdue
          ? "bg-red-50 text-black ring-red-200 hover:ring-red-300"
          : "bg-white text-black ring-black/8 hover:ring-black/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">
          {rental.itemName} · {rental.quantity}개
        </p>
        {overdue ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
            기한 초과
          </span>
        ) : null}
      </div>
      {showStudentId ? (
        <p className={`text-sm ${active ? "text-white/70" : "text-gray-400"}`}>
          {rental.studentName} ({rental.studentId}) · {rental.phone} · {formatWhen(rental.rentedAt)}
        </p>
      ) : (
        <p className={`text-sm ${active ? "text-white/70" : "text-gray-400"}`}>
          {formatWhen(rental.rentedAt)} 대여
        </p>
      )}
      {rental.dueDate ? (
        <p className={`text-xs mt-0.5 ${active ? "text-white/60" : overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
          반납 기한 {formatWhen(rental.dueDate)}
        </p>
      ) : null}
    </button>
  );
}

export function ReturnPanel({ rentals, isAdmin = false }: { rentals: Rental[]; isAdmin?: boolean }) {
  const router = useRouter();
  const { user, idToken } = useFirebaseAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const myRentals = useMemo(
    () => (user ? rentals.filter((r) => r.uid === user.uid) : []),
    [rentals, user],
  );

  const overdueMyRentals = useMemo(() => myRentals.filter(isOverdue), [myRentals]);

  // 검색: 관리자만 사용 가능, 본인 것 제외한 나머지
  const otherRentals = useMemo(
    () => rentals.filter((r) => r.uid !== user?.uid),
    [rentals, user],
  );
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return otherRentals.filter(
      (r) => r.studentId.includes(q) || r.studentName.includes(q),
    );
  }, [query, otherRentals]);

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

  // 선택된 대여 항목 및 본인 여부
  const allVisible = [...myRentals, ...searchResults];
  const selectedRental = allVisible.find((r) => r.id === selected);
  const isOwn = selectedRental?.uid === user.uid;

  return (
    <div className="space-y-4">
      {/* 기한 초과 경고 */}
      {overdueMyRentals.length > 0 ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">⚠️ 반납 기한이 지난 물품이 있습니다!</p>
          <ul className="mt-1 space-y-0.5">
            {overdueMyRentals.map((r) => (
              <li key={r.id} className="text-sm text-red-600">
                {r.itemName} {r.quantity}개 — 기한 {formatWhen(r.dueDate!)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 내 대여 목록 */}
      {myRentals.length > 0 ? (
        <section>
          <p className="mb-2 text-sm font-medium text-black">내 대여 목록</p>
          <ul className="space-y-2">
            {myRentals.map((rental) => (
              <li key={rental.id}>
                <RentalCard
                  rental={rental}
                  active={selected === rental.id}
                  showStudentId={false}
                  onClick={() => setSelected(rental.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          현재 대여 중인 물품이 없습니다.
        </p>
      )}

      {/* 관리자 전용: 다른 사람 대여 검색 */}
      {isAdmin ? (
        <section>
          <p className="mb-2 text-sm font-medium text-black">다른 사람 대여 검색 (관리자)</p>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            placeholder="학번 또는 이름으로 검색"
            className="w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-black/10"
          />
          {searchResults.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {searchResults.map((rental) => (
                <li key={rental.id}>
                  <RentalCard
                    rental={rental}
                    active={selected === rental.id}
                    showStudentId={true}
                    onClick={() => setSelected(rental.id)}
                  />
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <p className="mt-2 text-sm text-gray-400">검색 결과가 없습니다.</p>
          ) : null}
        </section>
      ) : null}

      {/* 반납 폼 */}
      {selected ? (
        isOwn || isAdmin ? (
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
          <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <p className="text-sm text-amber-800">
              본인이 대여한 물건만 반납할 수 있습니다. 대여 할 때 사용한 Google 계정으로 로그인해 주세요.
            </p>
          </div>
        )
      ) : myRentals.length > 0 ? (
        <p className="text-sm text-gray-400">
          위에서 반납할 물품을 선택한 뒤 사진을 찍어 주세요.
        </p>
      ) : null}
    </div>
  );
}
