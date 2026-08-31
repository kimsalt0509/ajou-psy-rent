import type { ItemWithStock } from "@/lib/types";

export function StockCard({ item }: { item: ItemWithStock }) {
  const empty = item.remaining === 0;
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{item.emoji}</span>
            {item.consumable && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                소모품
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-bold text-black">{item.name}</h2>
          {item.note ? (
            <p className="mt-1 text-sm text-gray-400">{item.note}</p>
          ) : null}
        </div>
        <div
          className={`rounded-2xl px-3 py-2 text-right ${
            empty
              ? "bg-pink-50 text-pink-700 ring-1 ring-pink-200"
              : "bg-gray-50 text-black ring-1 ring-black/8"
          }`}
        >
          <p className="text-[11px] font-medium tracking-wide text-gray-400">
            {item.consumable ? "남은 수량" : "지금 대여 가능"}
          </p>
          <p className="text-3xl font-bold leading-none">{item.remaining}</p>
        </div>
      </div>
      {!item.consumable && (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <dt className="text-gray-400">보유</dt>
            <dd className="font-semibold text-black">{item.total}개</dd>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <dt className="text-gray-400">대여 중</dt>
            <dd className="font-semibold text-black">{item.rented}개</dd>
          </div>
        </dl>
      )}
    </article>
  );
}
