import { ReturnPanel } from "@/components/ReturnPanel";
import { getRentals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ReturnPage() {
  const rentals = await getRentals({ activeOnly: true });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black">반납</h2>
        <p className="mt-1 text-sm text-gray-400">
          내 학번으로 찾은 뒤, 물품을 제자리에 둔 사진을 찍고 반납하세요.
        </p>
      </div>
      <ReturnPanel rentals={rentals} />
    </div>
  );
}
