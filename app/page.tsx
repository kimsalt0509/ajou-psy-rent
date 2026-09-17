import Link from "next/link";
import { StockList } from "@/components/StockList";
import { getItemsWithStock } from "@/lib/store";
import type { ItemWithStock } from "@/lib/types";

export const dynamic = "force-dynamic";

const DONE_MESSAGES: Record<string, string> = {
  rent: "대여가 기록되었습니다. 확인 메일이 발송되며, 재고 수량에 바로 반영됩니다.",
  return: "반납이 완료되었습니다. 이용해 주셔서 감사합니다!",
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { done } = await searchParams;
  const doneMessage = typeof done === "string" ? DONE_MESSAGES[done] : undefined;

  let items: ItemWithStock[] = [];
  let loadFailed = false;
  try {
    items = await getItemsWithStock();
  } catch (err) {
    console.error("[HomePage] Firebase error:", err);
    loadFailed = true;
  }
  const remaining = items.reduce((sum, item) => sum + item.remaining, 0);

  return (
    <div className="space-y-5">
      {doneMessage ? (
        <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900 ring-1 ring-green-200">
          {doneMessage}
        </p>
      ) : null}
      <section className="rounded-3xl bg-black px-5 py-5 text-white">
        <p className="text-sm text-white/50">과방에 지금 남아 있는 물품</p>
        <p className="mt-1 text-5xl font-bold">{loadFailed ? "—" : `${remaining}개`}</p>
        <p className="mt-2 text-sm text-white/60">
          대여 가능한 물품 수량을 확인할 수 있습니다. 대여·반납은 로그인 후 이용해 주세요. 대여한
          물품은 사용 후 반드시 반납해 주시기 바랍니다.
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

      {loadFailed ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          재고 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
        </p>
      ) : (
        <StockList items={items} />
      )}
    </div>
  );
}
