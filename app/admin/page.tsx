import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { getItemsWithStock, getNotice, getRentals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-black">학생회 관리</h2>
        <AdminLogin />
      </div>
    );
  }

  const [items, rentals, notice] = await Promise.all([
    getItemsWithStock(),
    getRentals({}),
    getNotice(),
  ]);

  const sorted = [...rentals].sort(
    (a, b) => new Date(b.rentedAt).getTime() - new Date(a.rentedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-black">학생회 관리</h2>
      <AdminPanel items={items} rentals={sorted} notice={notice} />
    </div>
  );
}
