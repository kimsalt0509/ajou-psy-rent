import type { AdminLog } from "@/lib/audit";
import { formatKST } from "@/lib/time";

export function AdminLogs({ logs }: { logs: AdminLog[] }) {
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-black/8">
      <h2 className="font-bold text-black">변경 기록</h2>
      <p className="mt-1 text-sm text-gray-400">관리자만 볼 수 있습니다. 누가, 언제, 무엇을 바꿨는지 남습니다.</p>
      {logs.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">아직 기록이 없습니다.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {logs.map((log) => (
            <li key={log.id} className="py-3">
              <p className="text-sm text-black">{log.summary}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {log.name}
                {log.email ? ` · ${log.email}` : ""} · {log.at ? formatKST(log.at, "datetime") : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
