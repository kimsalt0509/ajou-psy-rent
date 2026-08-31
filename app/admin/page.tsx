import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { getItemsWithStock, getRentals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-black">학생회 관리</h2>
        <AdminLogin />
        <p className="text-xs text-gray-400">
          기본 비밀번호는{" "}
          <code className="bg-gray-100 px-1 rounded">psy0624</code> 입니다.
          서버의{" "}
          <code className="bg-gray-100 px-1 rounded">ADMIN_PIN</code>{" "}
          환경변수로 바꿀 수 있습니다.
        </p>
      </div>
    );
  }

  const [items, rentals] = await Promise.all([
    getItemsWithStock(),
    getRentals({}),
  ]);

  const sorted = [...rentals].sort(
    (a, b) => new Date(b.rentedAt).getTime() - new Date(a.rentedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-black">학생회 관리</h2>
      <AdminPanel items={items} rentals={sorted} />
    </div>
  );
}
