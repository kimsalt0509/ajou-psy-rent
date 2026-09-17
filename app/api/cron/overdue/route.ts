import { NextRequest } from "next/server";
import { getRentals, getItems, markOverdueNotified, purgeOldRentals } from "@/lib/store";
import { sendOverdueNotification } from "@/lib/email";
import { adminAuth } from "@/lib/firebase-admin";
import { deletePhotoByUrl } from "@/lib/photos";
import { daysOverdue, isOverdue, kstDateKey } from "@/lib/time";
import { RETENTION_DAYS } from "@/lib/config";

export const maxDuration = 60;

// Vercel Cron이 호출 — 매일 오전 9시 KST (vercel.json: 0 0 * * * UTC)
// Vercel은 CRON_SECRET 환경변수가 있으면 Authorization: Bearer <CRON_SECRET> 를 붙여 호출합니다.

/** 연체 알림 발송일: 1일차, 3일차, 이후 7일마다 (매일 보내면 스팸이 됨) */
function shouldNotify(days: number) {
  return days === 1 || days === 3 || (days > 0 && days % 7 === 0);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET이 설정되지 않아 실행하지 않습니다.");
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = kstDateKey(now);
  const [rentals, items] = await Promise.all([getRentals({ activeOnly: true }), getItems()]);
  const consumableIds = new Set(items.filter((i) => i.consumable).map((i) => i.id));

  const targets = rentals.filter(
    (r) =>
      r.dueDate &&
      !consumableIds.has(r.itemId) &&
      isOverdue(r.dueDate, now) &&
      r.overdueNotifiedOn !== today &&
      shouldNotify(daysOverdue(r.dueDate, now)),
  );

  let sent = 0;
  for (const rental of targets) {
    try {
      const studentEmail = await adminAuth()
        .getUser(rental.uid)
        .then((u) => u.email ?? null)
        .catch(() => null); // 조회 실패해도 관리자에게는 발송

      await sendOverdueNotification({
        studentName: rental.studentName,
        studentId: rental.studentId,
        phone: rental.phone,
        studentEmail,
        itemName: rental.itemName,
        quantity: rental.quantity,
        dueDate: rental.dueDate!,
        daysPast: daysOverdue(rental.dueDate!, now),
      });
      await markOverdueNotified(rental.id, today);
      sent++;
    } catch (err) {
      console.error(`[cron] overdue mail failed for ${rental.id}:`, err);
    }
  }

  // 개인정보 보관기간이 지난 반납 기록 정리 (RETENTION_DAYS 설정 시에만)
  let purged = 0;
  if (RETENTION_DAYS > 0) {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    purged = await purgeOldRentals(cutoff, deletePhotoByUrl).catch((err) => {
      console.error("[cron] purge failed:", err);
      return 0;
    });
  }

  const overdueTotal = rentals.filter(
    (r) => !consumableIds.has(r.itemId) && isOverdue(r.dueDate, now),
  ).length;

  return Response.json({ sent, overdue: overdueTotal, purged });
}
