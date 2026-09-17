"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getClientAuth } from "@/lib/firebase-client";

type Props = {
  name: string;
  email: string;
  image?: string | null;
};

export function UserMenu({ name, email, image }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut(getClientAuth());
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          className="h-7 w-7 rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700"
        >
          {name[0]}
        </div>
      )}
      <div className="hidden sm:block">
        <p className="text-xs font-medium text-black leading-none">{name}</p>
        <p className="text-[10px] text-gray-400 leading-none mt-0.5">{email}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="ml-1 rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
      >
        로그아웃
      </button>
    </div>
  );
}
