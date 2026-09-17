"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseLinks = [
  { href: "/", label: "재고" },
  { href: "/rent", label: "대여" },
  { href: "/return", label: "반납" },
  { href: "/admin", label: "관리" },
];

const adminLinks = [
  { href: "/status", label: "현황" },
  { href: "/storage", label: "창고" },
  { href: "/records", label: "기록" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

// 학생용 4개 탭은 항상 같은 자리에, 관리자 탭은 아래 줄에 따로 (모바일에서 7칸으로 찌그러지지 않도록)
export function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="space-y-1.5">
      <ul className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
        {baseLinks.map((link) => (
          <li key={link.href}>
            <NavLink {...link} active={isActive(pathname, link.href)} />
          </li>
        ))}
      </ul>
      {isAdmin ? (
        <ul className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-900 p-1" aria-label="관리자 메뉴">
          {adminLinks.map((link) => (
            <li key={link.href}>
              <NavLink {...link} active={isActive(pathname, link.href)} dark />
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  dark = false,
}: {
  href: string;
  label: string;
  active: boolean;
  dark?: boolean;
}) {
  const tone = dark
    ? active
      ? "bg-white text-black"
      : "text-white/60 hover:text-white"
    : active
      ? "bg-black text-white shadow-sm"
      : "text-gray-500 hover:text-black";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-xl px-1 text-center font-medium transition ${
        dark ? "py-1.5 text-xs" : "py-2 text-sm"
      } ${tone}`}
    >
      {label}
    </Link>
  );
}
