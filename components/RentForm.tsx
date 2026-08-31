"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemWithStock } from "@/lib/types";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { PhotoField } from "./PhotoField";

type Props = {
  items: ItemWithStock[];
  defaultName?: string;
};

export function RentForm({ items, defaultName }: Props) {
  const router = useRouter();
  const { user, idToken } = useFirebaseAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const available = items.filter((item) => item.remaining > 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idToken) {
      setError("로그인이 필요합니다.");
      return;
    }
    setError("");
    setPending(true);
    const body = new FormData(event.currentTarget);

    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body,
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "대여에 실패했습니다.");
      return;
    }

    router.push("/?done=rent");
    router.refresh();
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
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-black">
          물품 <span className="text-red-500">*</span>
        </span>
        <select
          name="itemId"
          required
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-black ring-1 ring-black/10"
          defaultValue=""
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
          defaultValue={1}
          required
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-black/10"
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
          placeholder="예: 202412345"
          required
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-black/10"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-black">
          이름 <span className="text-red-500">*</span>
        </span>
        <input
          name="studentName"
          placeholder="본인 이름"
          required
          minLength={2}
          defaultValue={defaultName ?? ""}
          className="w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-black/10"
        />
      </label>

      <PhotoField name="photo" label="대여 사진 (물품과 함께)" />

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
        {pending ? "기록 중..." : "대여하기"}
      </button>
    </form>
  );
}
