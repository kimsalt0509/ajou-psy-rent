import { ReturnPanel } from "@/components/ReturnPanel";
import { isAdmin } from "@/lib/admin";
import { getItems, getRentals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ReturnPage() {
  const [rentals, items, admin] = await Promise.all([
    getRentals({ activeOnly: true }),
    getItems(),
    isAdmin(),
  ]);

  // 소모품은 반납 불필요 → 목록에서 제외
  const consumableIds = new Set(items.filter((i) => i.consumable).map((i) => i.id));
  const returnableRentals = rentals.filter((r) => !consumableIds.has(r.itemId));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black">반납</h2>
        <p className="mt-1 text-sm text-gray-400">
          내 대여 목록에서 물품을 선택하고 사진을 찍어 반납하세요.
        </p>
      </div>
      <ReturnPanel rentals={returnableRentals} isAdmin={admin} />
    </div>
  );
}
