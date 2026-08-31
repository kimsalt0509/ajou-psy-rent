import { cookies } from "next/headers";

export const ADMIN_COOKIE = "psy-admin";

export function adminPin() {
  return process.env.ADMIN_PIN ?? "psy0624";
}

export async function isAdmin() {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === "1";
}
