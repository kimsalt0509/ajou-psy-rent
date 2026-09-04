import Link from "next/link";
import { StockList } from "@/components/StockList";
import { getItemsWithStock } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;

  let items: Awaited<ReturnType<typeof getItemsWithStock>> = [];
  try {
    items = await getItemsWithStock();
  } catch (err) {
    console.error("[HomePage] Firebase error:", err);
  }
  const remaining = items.reduce((sum, item) => sum + item.remaining, 0);

  return (
    <div className="space-y-5">
      {done === "rent" && (
        <p className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-black">
          대여가 기록되었습니다. 재고 수량이 바로 반영됩니다.
        </p>
      )}
      <section className="rounded-3xl bg-black px-5 py-5 text-white">
        <p className="text-sm text-white/50">과방에 지금 남아 있는 물품!</p>
        <p className="mt-1 text-5xl font-bold">{remaining}개</p>
        <p className="mt-2 text-sm text-white/60">
          해당 사이트에서 대여 가능한 물품의 수량을 확인하실 수 있습니다. 물품 대여 및 반납을 원하실 경우 로그인 후 이용해 주시기 바랍니다. 대여한 물품은 사용 후 반드시 반납해 주시기 바랍니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/rent"
            className="rounded-2xl bg-white py-3 text-center text-sm font-semibold text-black hover:bg-gray-100 transition"
          >
            대여하기
          </Link>
          <Link
            href="/return"
            className="rounded-2xl bg-white/10 py-3 text-center text-sm font-semibold text-white hover:bg-white/20 transition"
          >
            반납하기
          </Link>
        </div>
      </section>

      <StockList items={items} />
    </div>
  );
}
