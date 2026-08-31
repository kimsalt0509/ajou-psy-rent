import { RentForm } from "@/components/RentForm";
import { getItemsWithStock } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RentPage() {
  const items = await getItemsWithStock();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black">대여 기록</h2>
        <p className="mt-1 text-sm text-gray-400">
          학번·이름·수량과 물품 사진을 남기면 재고가 바로 줄어듭니다.
        </p>
      </div>
      <RentForm items={items} />
    </div>
  );
}
