"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemWithStock, RentalProfile } from "@/lib/types";
import { compressPhotoField } from "@/lib/image-compress";
import { readResponse, useFirebaseAuth } from "./FirebaseAuthProvider";
import { PhotoField } from "./PhotoField";

const inputClass =
  "w-full rounded-2xl border-0 bg-white px-4 py-3 text-black ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black/30";

/** 입력 중인 휴대폰 번호에 하이픈 자동 삽입 */
function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function RentForm({
  items,
  retentionDays,
}: {
  items: ItemWithStock[];
  retentionDays: number;
}) {
  const router = useRouter();
  const { user, loading, authFetch } = useFirebaseAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [profile, setProfile] = useState<RentalProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [itemId, setItemId] = useState("");
  const available = items.filter((item) => item.remaining > 0);
  const selectedItem = available.find((i) => i.id === itemId);

  // 지난번 입력한 이름·학번·전화번호 불러오기
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetch("/api/me")
      .then((res) => (res.ok ? readResponse<{ profile: RentalProfile | null }>(res) : null))
      .then((data) => {
        if (cancelled || !data?.profile) return;
        setProfile(data.profile);
        setPhone((p) => p || data.profile!.phone);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, authFetch]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const body = new FormData(event.currentTarget);
      await compressPhotoField(body);
      const res = await authFetch("/api/rentals", { method: "POST", body });
      const data = await readResponse<{ rental?: { itemName: string } }>(res);
      if (!res.ok) throw new Error(data.error ?? "대여에 실패했습니다.");
      router.push("/?done=rent");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "대여에 실패했습니다.");
      setPending(false);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-black/8" aria-hidden />;
  }

  if (!user) {
    return (
      <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
        대여하려면 먼저{" "}
        <a href="/login" className="underline text-black">
          로그인
        </a>
        해 주세요.
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
        지금 대여할 수 있는 물품이 없습니다. 반납되면 수량이 다시 올라갑니다.
      </p>
    );
  }

  return (
    // key: 프로필을 불러오면 기본값을 다시 채우기 위해 폼을 다시 그림
    <form key={profile ? "filled" : "empty"} onSubmit={onSubmit} className="space-y-4">
      {profile ? (
        <p className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500">
          지난번 입력한 정보를 불러왔습니다. 바뀐 내용이 있으면 수정해 주세요.
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-black">
          이름 <span className="text-red-500">*</span>
        </span>
        <input
          name="studentName"
          placeholder="본인 이름"
          autoComplete="name"
          required
          minLength={2}
          maxLength={30}
          defaultValue={profile?.studentName ?? user.displayName ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-black">
          학번 <span className="text-red-500">*</span>
        </span>
        <input
          name="studentId"
          inputMode="numeric"
          pattern="\d{6,10}"
          title="숫자 6~10자리"
          placeholder="예: 202412345"
          required
          defaultValue={profile?.studentId ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-black">
          전화번호 <span className="text-red-500">*</span>
        </span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          pattern="01[016789]-?\d{3,4}-?\d{4}"
          title="예: 010-1234-5678"
          placeholder="010-1234-5678"
          required
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-black">
            물품 <span className="text-red-500">*</span>
          </span>
          <select
            name="itemId"
            required
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              빌릴 물품 선택
            </option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emoji} {item.name} · 남은 {item.remaining}개
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-black">
            수량 <span className="text-red-500">*</span>
          </span>
          <input
            name="quantity"
            type="number"
            min={1}
            max={selectedItem?.remaining ?? undefined}
            defaultValue={1}
            required
            className={inputClass}
          />
        </label>
      </div>

      {selectedItem?.dueDays && !selectedItem.consumable ? (
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-100">
          이 물품은 대여일로부터 <strong>{selectedItem.dueDays}일 뒤 자정</strong>까지 반납해야 합니다.
        </p>
      ) : null}

      <PhotoField
        name="photo"
        label="대여 사진"
        hint="빌리는 물품이 잘 보이게 찍어 주세요."
      />

      <label className="flex items-start gap-2 rounded-2xl bg-white p-3 ring-1 ring-black/8">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
        <span className="text-xs leading-relaxed text-gray-600">
          <strong className="text-black">[필수] 개인정보 수집·이용 동의</strong>
          <br />
          수집 항목: 이름, 학번, 전화번호, 이메일, 대여·반납 사진 · 목적: 물품 대여 관리 및
          미반납 시 연락 · 보유 기간:{" "}
          {retentionDays > 0
            ? `반납 완료 후 ${retentionDays}일 (이후 자동 파기)`
            : "반납 완료 후 대여 관리 목적 달성 시까지"}
        </span>
      </label>

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
        {pending ? "사진 올리는 중..." : "대여하기"}
      </button>
    </form>
  );
}
