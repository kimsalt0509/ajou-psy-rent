import { NextRequest } from "next/server";
import { savePhoto } from "@/lib/photos";
import { completeReturn, getRentalById } from "@/lib/store";
import { verifyUser } from "@/lib/auth-helper";
import { isAdmin } from "@/lib/admin";

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

  if (!(photo instanceof File))
    return Response.json({ error: "반납 사진을 찍어 주세요." }, { status: 400 });

  try {
    const returnPhoto = await savePhoto(photo, "return");
    const rental = await completeReturn(id, {
      returnPhoto,
      returnedAt: new Date().toISOString(),
    });
    return Response.json({ rental });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "반납에 실패했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}
