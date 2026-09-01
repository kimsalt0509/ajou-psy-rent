import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getItems, getRentals } from "@/lib/store";

export const dynamic = "force-dynamic";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(dueDate: string | null) {
  return !!dueDate && new Date(dueDate) < new Date();
}

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  if (!(await isAdmin())) redirect("/");

  const { done } = await searchParams;
  const [rentals, items] = await Promise.all([
    getRentals({ activeOnly: true }),
    getItems(),
  ]);

  // 소모품 itemId 목록
  const consumableIds = new Set(items.filter((i) => i.consumable).map((i) => i.id));

  // 소모품 제외
  const activeRentals = rentals.filter((r) => !consumableIds.has(r.itemId));

  // 기한 초과 목록
  const overdueRentals = activeRentals.filter((r) => isOverdue(r.dueDate));

  // 품목별 그룹핑
  const groups = new Map<string, { itemName: string; rentals: typeof activeRentals }>();
  for (const rental of activeRentals) {
    if (!groups.has(rental.itemId)) {
      groups.set(rental.itemId, { itemName: rental.itemName, rentals: [] });
    }
    groups.get(rental.itemId)!.rentals.push(rental);
  }

  return (
    <div className="space-y-4">
      {done === "rent" ? (
        <p className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-black">
          대여가 기록되었습니다. 재고 수량이 바로 반영됩니다.
        </p>
      ) : null}
      {done === "return" ? (
        <p className="rounded-2xl bg-pink-50 px-4 py-3 text-sm text-pink-900 ring-1 ring-pink-200">
          반납이 완료되었습니다. 다른 사람이 다시 빌릴 수 있습니다.
        </p>
      ) : null}

      <div>
        <h2 className="text-xl font-bold text-black">지금 빌려 간 사람</h2>
        <p className="mt-1 text-sm text-gray-400">반납되면 이 목록에서 빠집니다.</p>
      </div>

      {/* 기한 초과 상단 경고 */}
      {overdueRentals.length > 0 ? (
        <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-300">
          <p className="text-sm font-bold text-red-700 mb-2">
            ⚠️ 반납 기한 초과 {overdueRentals.length}건 — 즉시 연락 필요
          </p>
          <ul className="space-y-2">
            {overdueRentals.map((r) => (
              <li key={r.id} className="rounded-xl bg-red-100 px-3 py-2">
                <p className="font-semibold text-red-900">{r.studentName}</p>
                <p className="text-sm text-red-800">{r.itemName} · {r.quantity}개</p>
                <p className="text-xs text-red-700 mt-0.5">
                  {r.studentId} · {r.phone}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  반납 기한 {formatWhen(r.dueDate!)} 초과
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeRentals.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          현재 대여 중인 기록이 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([itemId, group]) => (
            <section key={itemId} className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
              <h3 className="text-lg font-bold text-black mb-3">{group.itemName}</h3>
              <ul className="space-y-3">
                {group.rentals.map((rental) => {
                  const overdue = isOverdue(rental.dueDate);
                  return (
                    <li
                      key={rental.id}
                      className={`rounded-2xl px-4 py-3 ${overdue ? "bg-red-50 ring-1 ring-red-200" : "bg-gray-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-bold text-black">{rental.studentName}</p>
                        {overdue ? (
                          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
                            기한 초과
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {rental.quantity}개 빌림
                      </p>
                      <p className="text-sm text-gray-500">
                        학번 {rental.studentId} · {rental.phone}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatWhen(rental.rentedAt)} 대여
                      </p>
                      {rental.dueDate ? (
                        <p className={`text-xs mt-0.5 ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                          반납 기한 {formatWhen(rental.dueDate)}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
