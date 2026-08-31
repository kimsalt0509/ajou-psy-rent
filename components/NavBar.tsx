"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "재고" },
  { href: "/rent", label: "대여" },
  { href: "/return", label: "반납" },
  { href: "/admin", label: "관리" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-1 py-2 text-center text-sm font-medium transition ${
              active
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
