import { NextRequest, after } from "next/server";
import { savePhoto } from "@/lib/photos";
import { completeReturn, getRentalById } from "@/lib/store";
import { unauthorized, verifyUser } from "@/lib/auth-helper";
import { isAdmin } from "@/lib/admin";
import { sendReturnNotification } from "@/lib/email";
import { adminAuth } from "@/lib/firebase-admin";
import { InputError, errorResponse } from "@/lib/validate";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rentals/[id]/return">,
) {
  const user = await verifyUser(request);
  if (!user) return unauthorized();

  const { id } = await ctx.params;

  try {
    const existing = await getRentalById(id);
    if (!existing)
      return Response.json({ error: "대여 기록을 찾을 수 없습니다." }, { status: 404 });

    // 본인 대여 or 관리자만 반납 가능
    const isOwn = existing.uid === user.uid;
    const admin = await isAdmin();
    if (!isOwn && !admin)
      return Response.json({ error: "본인의 대여 기록만 반납할 수 있습니다." }, { status: 403 });

    const form = await request.formData();
    const photo = form.get("photo");
    const hasPhoto = photo instanceof File && photo.size > 0;

    // 본인 반납은 사진 필수 / 관리자가 타인 건 강제 반납 시 사진 선택
    if (isOwn && !hasPhoto) throw new InputError("반납 사진을 찍어 주세요.");

    const returnPhoto = hasPhoto ? await savePhoto(photo, "return") : null;
    const rental = await completeReturn(id, {
      returnPhoto,
      returnedAt: new Date().toISOString(),
      returnedBy: isOwn ? "self" : "admin",
    });

    after(async () => {
      try {
        let studentEmail: string | null = isOwn ? (user.email ?? null) : null;
        if (!isOwn) {
          studentEmail = await adminAuth()
            .getUser(rental.uid)
            .then((r) => r.email ?? null)
            .catch(() => null);
        }
        await sendReturnNotification({
          studentName: rental.studentName,
          studentId: rental.studentId,
          itemName: rental.itemName,
          quantity: rental.quantity,
          returnedAt: rental.returnedAt!,
          dueDate: rental.dueDate ?? null,
          studentEmail,
        });
      } catch (err) {
        console.error("[email] return notification failed:", err);
      }
    });

    return Response.json({ rental: { id: rental.id, returnedAt: rental.returnedAt } });
  } catch (error) {
    return errorResponse(error, "반납에 실패했습니다.");
  }
}
