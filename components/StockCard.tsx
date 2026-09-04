import type { ItemWithStock } from "@/lib/types";

export function StockCard({ item }: { item: ItemWithStock }) {
  const empty = item.remaining === 0;
  return (
    <article className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/8 flex flex-col gap-2">
      {/* 상단: 이모지 + 이름 + 소모품 뱃지 */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-2xl shrink-0">{item.emoji}</span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-black leading-tight truncate">{item.name}</h2>
          {item.consumable && (
            <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
              소모품
            </span>
          )}
        </div>
      </div>

      {/* 수량 뱃지 */}
      <div
        className={`rounded-xl px-3 py-2 flex items-center justify-between ${
          empty
            ? "bg-pink-50 ring-1 ring-pink-200"
            : "bg-gray-50 ring-1 ring-black/8"
        }`}
      >
        <p className="text-[10px] font-medium text-gray-400">
          {item.consumable ? "남은 수량" : "대여 가능"}
        </p>
        <p className={`text-2xl font-bold leading-none ${empty ? "text-pink-600" : "text-black"}`}>
          {item.remaining}
        </p>
      </div>

      {/* 보유/대여 중 (소모품 제외) */}
      {!item.consumable && (
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
            <p className="text-gray-400">보유</p>
            <p className="font-semibold text-black">{item.total}개</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
            <p className="text-gray-400">대여 중</p>
            <p className="font-semibold text-black">{item.rented}개</p>
          </div>
        </div>
      )}

      {/* 비고 */}
      {item.note ? (
        <p className="text-[11px] text-gray-400 leading-tight">{item.note}</p>
      ) : null}
    </article>
  );
}
