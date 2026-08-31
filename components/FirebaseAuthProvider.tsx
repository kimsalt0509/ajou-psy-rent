"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";

type AuthContext = {
  user: User | null;
  loading: boolean;
  idToken: string | null;
};

const Ctx = createContext<AuthContext>({ user: null, loading: true, idToken: null });

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    return getClientAuth().onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
  }, []);

  return <Ctx.Provider value={{ user, loading, idToken }}>{children}</Ctx.Provider>;
}

export function useFirebaseAuth() {
  return useContext(Ctx);
}
