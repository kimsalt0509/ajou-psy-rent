import { NextRequest } from "next/server";
import { savePhoto } from "@/lib/photos";
import { completeReturn } from "@/lib/store";
import { verifyUser } from "@/lib/auth-helper";

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
