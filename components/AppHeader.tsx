"use client";

import Link from "next/link";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { NavBar } from "./NavBar";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  const { user, loading } = useFirebaseAuth();

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
          {loading ? (
            <div className="h-7 w-20 animate-pulse rounded-xl bg-gray-100" />
          ) : user ? (
            <UserMenu
              name={user.displayName ?? user.email ?? ""}
              email={user.email ?? ""}
              image={user.photoURL}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
            >
              로그인
            </Link>
          )}
        </div>
        <NavBar />
      </div>
    </header>
  );
}
