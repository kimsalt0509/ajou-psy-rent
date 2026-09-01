"use client";

import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { getClientAuth, googleProvider } from "@/lib/firebase-client";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { NavBar } from "./NavBar";
import { UserMenu } from "./UserMenu";

export function AppHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();

  async function handleLogin() {
    try {
      await signInWithPopup(getClientAuth(), googleProvider);
      router.push("/");
    } catch {
      // 팝업 닫힘 등 무시
    }
  }

  async function handleAdminLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/8 bg-white shadow-sm">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
              아주대학교 심리학과 학생회
            </p>
            <h1 className="text-base font-bold text-black leading-tight">
              과방 대여 장부
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-200 transition"
              >
                관리자 나가기
              </button>
            ) : null}
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded-xl bg-gray-100" />
            ) : user ? (
              <UserMenu
                name={user.displayName ?? user.email ?? ""}
                email={user.email ?? ""}
                image={user.photoURL}
              />
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
              >
                로그인
              </button>
            )}
          </div>
        </div>
        <NavBar isAdmin={isAdmin} />
      </div>
    </header>
  );
}
