"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { getClientAuth, googleProvider } from "@/lib/firebase-client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleLogin() {
    setError("");
    setPending(true);
    try {
      const result = await signInWithPopup(getClientAuth(), googleProvider);
      if (!result.user.email?.endsWith("@ajou.ac.kr")) {
        await getClientAuth().signOut();
        setError("@ajou.ac.kr 이메일만 이용할 수 있습니다.");
        setPending(false);
        return;
      }
      router.replace("/");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // 사용자가 팝업을 닫은 경우 — 에러 표시 안 함
      } else {
        setError("로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
        console.error(err);
      }
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-sm font-medium tracking-wide text-gray-400 uppercase">
            아주대학교 심리학과
          </p>
          <h1 className="mt-2 text-2xl font-bold text-black">과방 대여 장부</h1>
          <p className="mt-2 text-sm text-gray-500">
            아주대 Google 계정(@ajou.ac.kr)으로 로그인하세요.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-pink-50 border border-pink-200 px-4 py-3 text-sm text-pink-800">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/8 space-y-4">
          <button
            type="button"
            onClick={handleLogin}
            disabled={pending}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {pending ? "로그인 중..." : "Google로 로그인"}
          </button>
          <p className="text-center text-xs text-gray-400">
            @ajou.ac.kr 계정만 이용 가능합니다
          </p>
        </div>
      </div>
    </div>
  );
}
