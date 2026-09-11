import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getRentals } from "@/lib/store";
import { RecordsList } from "@/components/RecordsList";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  if (!(await isAdmin())) redirect("/admin");

  const rentals = await getRentals({});
  const sorted = [...rentals].sort(
    (a, b) => new Date(b.rentedAt).getTime() - new Date(a.rentedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black">대여 기록</h2>
        <p className="mt-1 text-sm text-gray-400">모든 대여·반납 내역입니다. 사진을 클릭하면 크게 볼 수 있습니다.</p>
      </div>
      <RecordsList rentals={sorted} />
    </div>
  );
}
