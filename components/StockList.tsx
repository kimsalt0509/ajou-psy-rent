"use client";

import { useState } from "react";
import type { ItemWithStock } from "@/lib/types";
import { StockCard } from "./StockCard";

export function StockList({ items }: { items: ItemWithStock[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.note?.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  const rentable   = filtered.filter((i) => !i.consumable);
  const consumable = filtered.filter((i) =>  i.consumable);

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="물품 검색..."
          className="w-full rounded-2xl bg-white pl-9 pr-4 py-3 text-sm text-black placeholder-gray-400 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">검색 결과가 없습니다.</p>
      ) : (
        <>
          {/* 대여품 */}
          {rentable.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold text-gray-400 tracking-wide">대여품</p>
              <div className="grid grid-cols-2 gap-3">
                {rentable.map((item) => (
                  <StockCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* 소모품 */}
          {consumable.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold text-gray-400 tracking-wide">소모품</p>
              <div className="grid grid-cols-2 gap-3">
                {consumable.map((item) => (
                  <StockCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
