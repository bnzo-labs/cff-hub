"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard",          label: "Resumen",  icon: "fa-solid fa-chart-line" },
  { href: "/dashboard/pedidos",  label: "Pedidos",  icon: "fa-solid fa-bag-shopping" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "fa-solid fa-users" },
  { href: "/dashboard/cursos",   label: "Cursos",   icon: "fa-solid fa-graduation-cap" },
  { href: "/dashboard/finanzas", label: "Finanzas", icon: "fa-solid fa-coins" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
      style={{
        background: "var(--surface)",
        borderTop: "1.5px solid var(--border)",
        boxShadow: "0 -4px 12px rgba(157,36,178,0.06)",
      }}
    >
      {navItems.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={{
              color: active ? "var(--rose)" : "var(--muted)",
              fontFamily: "var(--font-sans)",
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
          >
            <i className={item.icon} style={{ fontSize: 18 }} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
