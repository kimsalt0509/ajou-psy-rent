import { RentForm } from "@/components/RentForm";
import { getItemsWithStock, getNotice } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RentPage() {
  const [items, notice] = await Promise.all([
    getItemsWithStock(),
    getNotice(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black">대여 기록</h2>
        <p className="mt-1 text-sm text-gray-400">
          학번·이름·수량과 물품 사진을 남기면 재고가 바로 줄어듭니다.
        </p>
      </div>
      {notice ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">공지 / 주의사항</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{notice}</p>
        </div>
      ) : null}
      <RentForm items={items} />
    </div>
  );
}
