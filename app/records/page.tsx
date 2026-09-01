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
      <h2 className="text-xl font-bold text-black">대여 기록</h2>
      <RecordsList rentals={sorted} />
    </div>
  );
}
