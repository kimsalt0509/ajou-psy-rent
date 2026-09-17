import { ReturnPanel } from "@/components/ReturnPanel";
import { isAdmin } from "@/lib/admin";
import { getReturnableRentals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ReturnPage() {
  const admin = await isAdmin();
  // 개인정보가 담긴 전체 목록은 관리자에게만 내려줌 (학생은 /api/me 로 본인 것만 조회)
  const adminRentals = admin ? await getReturnableRentals() : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black">반납</h2>
        <p className="mt-1 text-sm text-gray-400">
          내 대여 목록에서 물품을 선택하고 사진을 찍어 반납하세요.
        </p>
      </div>
      <ReturnPanel adminRentals={adminRentals} isAdmin={admin} />
    </div>
  );
}
