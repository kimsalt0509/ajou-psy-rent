"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MyRental, Rental } from "@/lib/types";
import { formatKST, isOverdue } from "@/lib/time";
import { compressPhotoField } from "@/lib/image-compress";
import { readResponse, useFirebaseAuth } from "./FirebaseAuthProvider";
import { PhotoField } from "./PhotoField";

function RentalCard({
  rental,
  active,
  showStudent,
  onClick,
}: {
  rental: MyRental;
  active: boolean;
  showStudent: boolean;
  onClick: () => void;
}) {
  const overdue = isOverdue(rental.dueDate);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
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
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}
          >
            기한 초과
          </span>
        ) : null}
      </div>
      <p className={`text-sm ${active ? "text-white/70" : "text-gray-400"}`}>
        {showStudent
          ? `${rental.studentName} (${rental.studentId}) · ${rental.phone} · ${formatKST(rental.rentedAt)}`
          : `${formatKST(rental.rentedAt)} 대여`}
      </p>
      {rental.dueDate ? (
        <p
          className={`text-xs mt-0.5 ${active ? "text-white/60" : overdue ? "text-red-500 font-medium" : "text-gray-400"}`}
        >
          반납 기한 {formatKST(rental.dueDate, "date")}까지
        </p>
      ) : null}
    </button>
  );
}

/**
 * 반납 화면.
 * - 학생: 본인 대여 목록을 /api/me 로 따로 받아옴 (다른 사람 정보는 내려오지 않음)
 * - 관리자: 서버에서 전체 대여 목록을 받아 검색·대리 반납
 */
export function ReturnPanel({
  adminRentals,
  isAdmin = false,
}: {
  adminRentals: Rental[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const { user, loading, authFetch } = useFirebaseAuth();
  const [myRentals, setMyRentals] = useState<MyRental[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetch("/api/me")
      .then(async (res) => {
        const data = await readResponse<{ rentals?: MyRental[] }>(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "대여 목록을 불러오지 못했습니다.");
        setMyRentals(data.rentals ?? []);
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  const overdueMine = useMemo(
    () => (myRentals ?? []).filter((r) => isOverdue(r.dueDate)),
    [myRentals],
  );

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!isAdmin || !q) return [];
    return adminRentals.filter(
      (r) => r.uid !== user?.uid && (r.studentId.includes(q) || r.studentName.includes(q)),
    );
  }, [query, adminRentals, isAdmin, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    setError("");
    setPending(true);
    try {
      const body = new FormData(event.currentTarget);
      await compressPhotoField(body);
      const res = await authFetch(`/api/rentals/${selected}/return`, { method: "POST", body });
      const data = await readResponse(res);
      if (!res.ok) throw new Error(data.error ?? "반납에 실패했습니다.");
      router.push(isAdmin ? "/status?done=return" : "/?done=return");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "반납에 실패했습니다.");
      setPending(false);
    }
  }

  if (loading || (user && myRentals === null && !loadError)) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-black/8" aria-hidden />;
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

  const mine = myRentals ?? [];
  const isOwn = mine.some((r) => r.id === selected);

  return (
    <div className="space-y-4">
      {loadError ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {loadError}
        </p>
      ) : null}

      {overdueMine.length > 0 ? (
        <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">반납 기한이 지난 물품이 있습니다!</p>
          <ul className="mt-1 space-y-0.5">
            {overdueMine.map((r) => (
              <li key={r.id} className="text-sm text-red-600">
                {r.itemName} {r.quantity}개 — 기한 {formatKST(r.dueDate!, "date")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mine.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-black">내 대여 목록</h3>
          <ul className="space-y-2">
            {mine.map((rental) => (
              <li key={rental.id}>
                <RentalCard
                  rental={rental}
                  active={selected === rental.id}
                  showStudent={false}
                  onClick={() => setSelected(rental.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : !loadError ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          현재 반납할 물품이 없습니다.
        </p>
      ) : null}

      {isAdmin ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-black">다른 사람 대여 검색 (관리자)</h3>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
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
                    showStudent
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

      {selected ? (
        <form
          key={selected}
          onSubmit={onSubmit}
          className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-black/8"
        >
          <PhotoField
            name="photo"
            label={isOwn ? "반납 사진" : "반납 사진 (선택 — 관리자 대리 반납)"}
            hint={isOwn ? "물품을 제자리에 둔 모습을 찍어 주세요." : undefined}
            required={isOwn}
          />
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-black py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? "반납 처리 중..." : "반납 완료하기"}
          </button>
        </form>
      ) : mine.length > 0 ? (
        <p className="text-sm text-gray-400">위에서 반납할 물품을 선택한 뒤 사진을 찍어 주세요.</p>
      ) : null}
    </div>
  );
}
