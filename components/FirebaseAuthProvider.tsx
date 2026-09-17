"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";

type AuthContext = {
  user: User | null;
  loading: boolean;
  /** 항상 유효한(필요 시 자동 갱신된) ID 토큰을 반환. 로그인 안 했으면 null */
  getToken: () => Promise<string | null>;
  /** 토큰을 붙여 API 호출 */
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const Ctx = createContext<AuthContext | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return getClientAuth().onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Firebase ID 토큰은 1시간이면 만료되므로 매 요청 직전에 받아옴 (만료 시 SDK가 자동 갱신)
  const getToken = useCallback(async () => {
    const current = getClientAuth().currentUser;
    return current ? current.getIdToken() : null;
  }, []);

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [getToken],
  );

  return (
    <Ctx.Provider value={{ user, loading, getToken, authFetch }}>{children}</Ctx.Provider>
  );
}

export function useFirebaseAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("FirebaseAuthProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

/** fetch 응답에서 JSON을 안전하게 꺼냄 (서버 오류로 HTML이 와도 터지지 않게) */
export async function readResponse<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string };
  } catch {
    return { error: `서버 오류가 발생했습니다. (${res.status})` } as T & { error?: string };
  }
}
