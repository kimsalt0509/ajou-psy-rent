import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { getItemsWithStock, getNotice, getFaviconUrl } from "@/lib/store";

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

  const [items, notice, faviconUrl] = await Promise.all([
    getItemsWithStock(),
    getNotice(),
    getFaviconUrl(),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-black">학생회 관리</h2>
      <AdminPanel items={items} notice={notice} faviconUrl={faviconUrl} />
    </div>
  );
}
