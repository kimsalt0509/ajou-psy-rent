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

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  if (!(await isAdmin())) redirect("/");

  const { done } = await searchParams;
  const rentals = await getRentals({ activeOnly: true });

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

      {rentals.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/8">
          현재 대여 중인 기록이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {rentals.map((rental) => (
            <li key={rental.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/8">
              <p className="font-semibold text-black">
                {rental.itemName} · {rental.quantity}개
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {rental.studentName} · {rental.studentId}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatWhen(rental.rentedAt)} 대여
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
