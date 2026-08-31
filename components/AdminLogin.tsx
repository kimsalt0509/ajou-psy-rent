"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = String(new FormData(event.currentTarget).get("pin") ?? "");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "로그인에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-black/8">
      <p className="text-sm text-gray-500">
        물품 수량 수정과 전체 기록 사진은 학생회만 볼 수 있습니다.
      </p>
      <input
        name="pin"
        type="password"
        required
        placeholder="관리 비밀번호"
        className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-black placeholder-gray-400"
      />
      {error ? (
        <p className="text-sm text-pink-700">{error}</p>
      ) : null}
      <button className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
        들어가기
      </button>
    </form>
  );
}
