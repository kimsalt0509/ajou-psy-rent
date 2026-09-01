import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getRentals } from "@/lib/store";

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
  const rentals = await getRentals({ activeOnly: true });
  const overdueCount = rentals.filter((r) => isOverdue(r.dueDate)).length;

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

      {overdueCount > 0 ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">
            ⚠️ 반납 기한 초과 {overdueCount}건
          </p>
        </div>
      ) : null}

      {rentals.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          현재 대여 중인 기록이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {rentals.map((rental) => {
            const overdue = isOverdue(rental.dueDate);
            return (
              <li
                key={rental.id}
                className={`rounded-2xl p-4 ring-1 ${overdue ? "bg-red-50 ring-red-200" : "bg-white ring-black/8"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-black">
                    {rental.itemName} · {rental.quantity}개
                  </p>
                  {overdue ? (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
                      기한 초과
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {rental.studentName} · {rental.studentId}
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
      )}
    </div>
  );
}
