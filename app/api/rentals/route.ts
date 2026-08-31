import { NextRequest } from "next/server";
import { savePhoto } from "@/lib/photos";
import { createRental, getItemsWithStock, getRentals } from "@/lib/store";
import { verifyUser } from "@/lib/auth-helper";

export async function GET(request: NextRequest) {
  const studentId =
    request.nextUrl.searchParams.get("studentId")?.trim() || undefined;
  const status = request.nextUrl.searchParams.get("status");

  const [rentals, items] = await Promise.all([
    getRentals({
      studentId,
      activeOnly: status === "active" ? true : undefined,
    }),
    getItemsWithStock(),
  ]);

  return Response.json({ rentals, items });
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user)
    return Response.json(
      { error: "로그인 후 이용할 수 있습니다." },
      { status: 401 },
    );

  const form = await request.formData();
  const itemId = String(form.get("itemId") ?? "").trim();
  const studentId = String(form.get("studentId") ?? "").trim();
  const studentName = String(form.get("studentName") ?? "").trim();
  const quantity = Number(form.get("quantity"));
  const photo = form.get("photo");

  if (!/^\d{6,10}$/.test(studentId))
    return Response.json(
      { error: "학번은 숫자 6~10자리로 입력해 주세요." },
      { status: 400 },
    );
  if (studentName.length < 2)
    return Response.json({ error: "이름을 정확히 입력해 주세요." }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1)
    return Response.json(
      { error: "수량은 1개 이상이어야 합니다." },
      { status: 400 },
    );
  if (!(photo instanceof File))
    return Response.json({ error: "대여 사진을 찍어 주세요." }, { status: 400 });

  try {
    const rentPhoto = await savePhoto(photo, "rent");
    const rental = await createRental({
      itemId,
      itemName: "",
      quantity,
      studentId,
      studentName,
      rentedAt: new Date().toISOString(),
      rentPhoto,
      returnedAt: null,
      returnPhoto: null,
    });

    // itemName을 채워 반환 (createRental 내부 트랜잭션에서도 item 조회하지만 여기선 간단히)
    return Response.json({ rental });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "대여에 실패했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}
