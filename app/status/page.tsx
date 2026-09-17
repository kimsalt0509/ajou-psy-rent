import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getReturnableRentals } from "@/lib/store";
import { daysOverdue, formatKST, isOverdue } from "@/lib/time";
import type { Rental } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StatusPage({ searchParams }: PageProps<"/status">) {
  if (!(await isAdmin())) redirect("/admin");

  const { done } = await searchParams;
  const activeRentals = await getReturnableRentals(); // 소모품 제외
  const now = new Date();
  const overdueRentals = activeRentals
    .filter((r) => isOverdue(r.dueDate, now))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));

  const groups = new Map<string, { itemName: string; rentals: Rental[] }>();
  for (const rental of activeRentals) {
    const g = groups.get(rental.itemId) ?? { itemName: rental.itemName, rentals: [] };
    g.rentals.push(rental);
    groups.set(rental.itemId, g);
  }

  return (
    <div className="space-y-4">
      {done === "return" ? (
        <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900 ring-1 ring-green-200">
          반납이 완료되었습니다. 다른 사람이 다시 빌릴 수 있습니다.
        </p>
      ) : null}

      <div>
        <h2 className="text-xl font-bold text-black">현황</h2>
        <p className="mt-1 text-sm text-gray-400">
          현재 대여 중인 물품을 품목별로 확인합니다. 기한(해당일 자정)이 지난 항목은 상단에
          표시됩니다.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/8">
          <dt className="text-xs text-gray-400">대여 중</dt>
          <dd className="text-2xl font-bold text-black">{activeRentals.length}건</dd>
        </div>
        <div
          className={`rounded-2xl px-4 py-3 ring-1 ${overdueRentals.length ? "bg-red-50 ring-red-200" : "bg-white ring-black/8"}`}
        >
          <dt className="text-xs text-gray-400">기한 초과</dt>
          <dd className={`text-2xl font-bold ${overdueRentals.length ? "text-red-600" : "text-black"}`}>
            {overdueRentals.length}건
          </dd>
        </div>
      </dl>

      {overdueRentals.length > 0 ? (
        <section className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-300">
          <h3 className="text-sm font-bold text-red-700 mb-2">
            반납 기한 초과 {overdueRentals.length}건 — 연락 필요
          </h3>
          <ul className="space-y-2">
            {overdueRentals.map((r) => (
              <li key={r.id} className="rounded-xl bg-red-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-red-900">{r.studentName}</p>
                  <span className="text-xs font-semibold text-red-700">
                    {daysOverdue(r.dueDate!, now)}일 경과
                  </span>
                </div>
                <p className="text-sm text-red-800">
                  {r.itemName} · {r.quantity}개
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  {r.studentId} ·{" "}
                  <a href={`tel:${r.phone.replace(/\D/g, "")}`} className="underline">
                    {r.phone}
                  </a>
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  반납 기한 {formatKST(r.dueDate!, "date")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeRentals.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          현재 대여 중인 기록이 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([itemId, group]) => (
            <section key={itemId} className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
              <h3 className="text-lg font-bold text-black mb-3">
                {group.itemName}{" "}
                <span className="text-sm font-normal text-gray-400">
                  {group.rentals.reduce((s, r) => s + r.quantity, 0)}개 대여 중
                </span>
              </h3>
              <ul className="space-y-3">
                {group.rentals.map((rental) => {
                  const overdue = isOverdue(rental.dueDate, now);
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
                      <p className="mt-1 text-sm text-gray-700">{rental.quantity}개 빌림</p>
                      <p className="text-sm text-gray-500">
                        학번 {rental.studentId} ·{" "}
                        <a href={`tel:${rental.phone.replace(/\D/g, "")}`} className="underline">
                          {rental.phone}
                        </a>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatKST(rental.rentedAt)} 대여
                      </p>
                      {rental.dueDate ? (
                        <p
                          className={`text-xs mt-0.5 ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}
                        >
                          반납 기한 {formatKST(rental.dueDate, "date")}까지
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
