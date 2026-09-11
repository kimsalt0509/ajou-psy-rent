import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import StoragePage from "./StoragePage";

export const dynamic = "force-dynamic";

export default async function StorageRoute() {
  if (!(await isAdmin())) redirect("/");
  return <StoragePage />;
}
