"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { readResponse, useFirebaseAuth } from "./FirebaseAuthProvider";

export function AdminLogin() {
  const router = useRouter();
  const { user, loading, authFetch } = useFirebaseAuth();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = String(new FormData(event.currentTarget).get("pin") ?? "");
    const res = await authFetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await readResponse(res);
    if (!res.ok) {
      setError(data.error ?? "로그인에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-black/8" aria-hidden />;
  }

  if (!user) {
    return (
      <p className="rounded-3xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
        관리자 비밀번호를 입력하려면 먼저{" "}
        <a href="/login" className="underline text-black">
          Google 로그인
        </a>
        을 해 주세요.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-black/8">
      <p className="text-xs text-gray-400">
        {user.email} 계정으로 관리 기록을 남깁니다.
      </p>
      <input
        name="pin"
        type="password"
        required
        placeholder="관리 비밀번호"
        className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-black placeholder-gray-400"
      />
      {error ? <p className="text-sm text-pink-700">{error}</p> : null}
      <button className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
        들어가기
      </button>
    </form>
  );
}
