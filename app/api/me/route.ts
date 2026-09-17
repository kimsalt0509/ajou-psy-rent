import { NextRequest } from "next/server";
import { unauthorized, verifyUser } from "@/lib/auth-helper";
import { getLastProfile, getReturnableRentals } from "@/lib/store";
import type { MyRental } from "@/lib/types";

// 로그인한 학생 본인의 정보만 반환 (반납 목록 + 대여 폼 자동 채우기)
export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return unauthorized();

  const [rentals, profile] = await Promise.all([
    getReturnableRentals({ uid: user.uid }),
    getLastProfile(user.uid),
  ]);

  const mine: MyRental[] = rentals.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    itemName: r.itemName,
    quantity: r.quantity,
    rentedAt: r.rentedAt,
    dueDate: r.dueDate,
    uid: r.uid,
  }));

  return Response.json(
    { rentals: mine, profile },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
