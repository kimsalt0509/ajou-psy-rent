import { NextRequest } from "next/server";
import { db } from "@/lib/firebase-admin";

// 관리자 전용 1회성 마이그레이션 API
// dueDate가 null인 활성 대여 기록에 rentedAt + dueDays일로 dueDate를 채워줌
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // ADMIN_PIN으로 보호
  if (body.secret !== process.env.ADMIN_PIN) {
    return Response.json({ error: "인증 실패" }, { status: 401 });
  }

  const dueDays: number = body.dueDays ?? 3;

  const snap = await db()
    .collection("rentals")
    .where("returnedAt", "==", null)
    .get();

  const nullDueDocs = snap.docs.filter(
    (d) => d.data().dueDate === null || d.data().dueDate === undefined,
  );

  if (nullDueDocs.length === 0) {
    return Response.json({ updated: 0, message: "dueDate가 null인 활성 대여 없음" });
  }

  const batch = db().batch();
  let count = 0;

  for (const doc of nullDueDocs) {
    const data = doc.data();
    const rentedAt = data.rentedAt as string;
    if (!rentedAt) continue;

    const dueDate = new Date(
      new Date(rentedAt).getTime() + dueDays * 24 * 60 * 60 * 1000
    ).toISOString();

    batch.update(doc.ref, { dueDate });
    count++;
  }

  await batch.commit();

  return Response.json({
    updated: count,
    message: `${count}건의 대여 기록에 dueDate를 rentedAt + ${dueDays}일로 설정했습니다.`,
  });
}
