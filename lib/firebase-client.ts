import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
import { type Firestore, doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 브라우저에서만 초기화 (SSR 중에는 실행하지 않음)
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

export function getClientApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getClientAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getClientApp());
  }
  return _auth;
}

export function getClientDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getClientApp());
  }
  return _db;
}

export const googleProvider = new GoogleAuthProvider();

/** Google 로그인 + users 컬렉션 upsert (헤더·로그인 페이지 공용) */
export async function signInWithGoogle() {
  const result = await signInWithPopup(getClientAuth(), googleProvider);
  const { uid, email, displayName, photoURL } = result.user;
  // 프로필 기록은 실패해도 로그인 자체는 성공으로 처리
  await setDoc(
    doc(getClientDb(), "users", uid),
    { uid, email, displayName, photoURL, lastLoginAt: serverTimestamp() },
    { merge: true },
  ).catch((err) => console.warn("[auth] users upsert failed", err));
  return result.user;
}

export function isPopupCancel(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}
