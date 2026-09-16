import { NextRequest } from "next/server";
import { getItems, getRentals } from "@/lib/store";
import { sendOverdueNotification } from "@/lib/email";
import { adminAuth } from "@/lib/firebase-admin";

// Vercel Cron이 호출하는 엔드포인트 — 매일 오전 9시 KST (0시 UTC)
// vercel.json 에서 cron 설정 필요

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 헤더 확인 (CRON_SECRET 환경변수로 보호)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [rentals, items] = await Promise.all([
    getRentals({ activeOnly: true }),
    getItems(),
  ]);

  // 소모품 itemId 목록
  const consumableIds = new Set(
    items.filter((i) => i.consumable).map((i) => i.id),
  );

  // dueDate 다음날 자정을 넘겼을 때만 초과 (당일 저녁까지 반납 허용, +1일 버퍼)
  // 소모품은 반납 개념 없으므로 제외
  const overdueRentals = rentals.filter((r) => {
    if (!r.dueDate) return false;
    if (consumableIds.has(r.itemId)) return false;
    const grace = new Date(r.dueDate);
    grace.setDate(grace.getDate() + 1);
    grace.setHours(0, 0, 0, 0);
    return now >= grace;
  });

  if (overdueRentals.length === 0) {
    return Response.json({ sent: 0 });
  }

  // Firebase Auth에서 uid → email 조회
  const auth = adminAuth();
  let sent = 0;

  for (const rental of overdueRentals) {
    try {
      let studentEmail: string | null = null;
      try {
        const userRecord = await auth.getUser(rental.uid);
        studentEmail = userRecord.email ?? null;
      } catch {
        // uid로 사용자 조회 실패해도 관리자에게는 보냄
      }

      const dueDate = rental.dueDate!;
      const daysPast = Math.floor(
        (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      await sendOverdueNotification({
        studentName: rental.studentName,
        studentId: rental.studentId,
        studentEmail,
        itemName: rental.itemName,
        quantity: rental.quantity,
        dueDate,
        daysPast,
      });
      sent++;
    } catch {
      // 개별 발송 실패는 무시하고 계속
    }
  }

  return Response.json({ sent, total: overdueRentals.length });
}
