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

  return (
    <div className="space-y-5">
      {doneMessage ? (
        <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900 ring-1 ring-green-200">
          {doneMessage}
        </p>
      ) : null}

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
