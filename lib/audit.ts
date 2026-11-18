import { db, adminAuth } from "./firebase-admin";
import { getAdminUid } from "./admin";

const COLLECTION = "adminLogs";

export type AdminLog = {
  id: string;
  at: string;
  uid: string;
  email: string;
  name: string;
  summary: string;
};

async function actorFromSession() {
  const uid = await getAdminUid();
  if (!uid) return { uid: "unknown", email: "", name: "관리자" };
  const user = await adminAuth()
    .getUser(uid)
    .catch(() => null);
  return {
    uid,
    email: user?.email ?? "",
    name: user?.displayName || user?.email || "관리자",
  };
}

/** 관리자 작업 기록. 실패해도 본 작업은 막지 않습니다. */
export async function logAdminAction(
  summary: string,
  actorOverride?: { uid: string; email: string; name: string },
): Promise<void> {
  try {
    const actor = actorOverride ?? (await actorFromSession());
    await db().collection(COLLECTION).add({
      at: new Date().toISOString(),
      uid: actor.uid,
      email: actor.email,
      name: actor.name,
      summary,
    });
  } catch (err) {
    console.error("[audit] 기록 실패:", err);
  }
}

export async function getAdminLogs(limit = 80): Promise<AdminLog[]> {
  const snap = await db().collection(COLLECTION).orderBy("at", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      at: typeof x.at === "string" ? x.at : "",
      uid: typeof x.uid === "string" ? x.uid : "",
      email: typeof x.email === "string" ? x.email : "",
      name: typeof x.name === "string" ? x.name : "관리자",
      summary: typeof x.summary === "string" ? x.summary : "",
    };
  });
}
