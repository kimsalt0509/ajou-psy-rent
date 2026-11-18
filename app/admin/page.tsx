import { AdminLogin } from "@/components/AdminLogin";
import { AdminLogs } from "@/components/AdminLogs";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { getAdminLogs } from "@/lib/audit";
import { getItemsWithStock, getNotice, getFaviconUrl, getAdminEmails } from "@/lib/store";

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

  const [items, notice, faviconUrl, adminEmails, logs] = await Promise.all([
    getItemsWithStock(),
    getNotice(),
    getFaviconUrl(),
    getAdminEmails(),
    getAdminLogs(),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-black">학생회 관리</h2>
      <AdminPanel
        items={items}
        notice={notice}
        faviconUrl={faviconUrl}
        adminEmails={adminEmails}
      />
      <AdminLogs logs={logs} />
    </div>
  );
}
