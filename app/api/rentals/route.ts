import { NextRequest, after } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { savePhoto } from "@/lib/photos";
import { createRental, getItemsWithStock, getRentals } from "@/lib/store";
import { unauthorized, verifyUser } from "@/lib/auth-helper";
import { sendRentNotification } from "@/lib/email";
import * as v from "@/lib/validate";

// 전체 대여 기록 조회 — 개인정보가 포함되므로 관리자 전용
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() || undefined;
  const status = request.nextUrl.searchParams.get("status");

  const [rentals, items] = await Promise.all([
    getRentals({ studentId, activeOnly: status === "active" || undefined }),
    getItemsWithStock(),
  ]);
  return Response.json({ rentals, items });
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return unauthorized();

  try {
    const form = await request.formData();
    if (form.get("consent") !== "on")
      throw new v.InputError("개인정보 수집·이용에 동의해 주세요.");

    const input = {
      itemId: v.str(form.get("itemId"), "물품", { min: 1, max: 100 }),
      studentId: v.studentId(form.get("studentId")),
      studentName: v.str(form.get("studentName"), "이름", { min: 2, max: 30 }),
      phone: v.phone(form.get("phone")),
      quantity: v.int(form.get("quantity"), "수량", { min: 1, max: 50 }),
    };
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0)
      throw new v.InputError("대여 사진을 찍어 주세요.");

    const rentPhoto = await savePhoto(photo, "rent");
    const rental = await createRental({ ...input, uid: user.uid, rentPhoto });

    // 메일은 응답을 보낸 뒤 발송 (대여 버튼이 메일 때문에 느려지지 않도록)
    after(() =>
      sendRentNotification({
        studentName: rental.studentName,
        studentId: rental.studentId,
        phone: rental.phone,
        itemName: rental.itemName,
        quantity: rental.quantity,
        dueDate: rental.dueDate,
        rentedAt: rental.rentedAt,
        studentEmail: user.email ?? null,
      }).catch((err) => console.error("[email] rent notification failed:", err)),
    );

    return Response.json({
      rental: {
        id: rental.id,
        itemName: rental.itemName,
        quantity: rental.quantity,
        dueDate: rental.dueDate,
      },
    });
  } catch (error) {
    return v.errorResponse(error, "대여에 실패했습니다.");
  }
}
