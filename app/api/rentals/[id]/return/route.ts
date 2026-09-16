import { NextRequest } from "next/server";
import { savePhoto } from "@/lib/photos";
import { completeReturn, getRentalById } from "@/lib/store";
import { verifyUser } from "@/lib/auth-helper";
import { isAdmin } from "@/lib/admin";
import { sendReturnNotification } from "@/lib/email";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rentals/[id]/return">,
) {
  const user = await verifyUser(request);
  if (!user)
    return Response.json(
      { error: "로그인 후 이용할 수 있습니다." },
      { status: 401 },
    );

  const { id } = await ctx.params;

  // 본인 대여 or 관리자만 반납 가능
  const rental = await getRentalById(id);
  if (!rental)
    return Response.json({ error: "대여 기록을 찾을 수 없습니다." }, { status: 404 });

  const admin = await isAdmin();
  if (!admin && rental.uid !== user.uid)
    return Response.json({ error: "본인의 대여 기록만 반납할 수 있습니다." }, { status: 403 });

  const form = await request.formData();
  const photo = form.get("photo");

  // 본인 반납은 사진 필수 / 관리자가 타인 건 강제 반납 시 사진 선택사항
  const isOwnRental = rental.uid === user.uid;
  if (isOwnRental && !(photo instanceof File && photo.size > 0))
    return Response.json({ error: "반납 사진을 찍어 주세요." }, { status: 400 });
  if (!isOwnRental && !admin)
    return Response.json({ error: "본인의 대여 기록만 반납할 수 있습니다." }, { status: 403 });

  try {
    const returnPhoto =
      photo instanceof File && photo.size > 0
        ? await savePhoto(photo, "return")
        : null;
    const rental = await completeReturn(id, {
      returnPhoto,
      returnedAt: new Date().toISOString(),
    });

    // 이메일 알림 발송 (Response 반환 전에 완료)
    try {
      await sendReturnNotification({
        studentName: rental.studentName,
        studentId: rental.studentId,
        itemName: rental.itemName,
        quantity: rental.quantity,
        returnedAt: rental.returnedAt!,
        dueDate: rental.dueDate ?? null,
        studentEmail: user.email ?? null,
      });
    } catch (err) {
      console.error("[email] return notification failed:", err);
    }

    return Response.json({ rental });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "반납에 실패했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}
