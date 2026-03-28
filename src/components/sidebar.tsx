"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard",          label: "Resumen",  icon: "fa-solid fa-chart-line" },
  { href: "/dashboard/pedidos",  label: "Pedidos",  icon: "fa-solid fa-bag-shopping" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "fa-solid fa-users" },
  { href: "/dashboard/cursos",   label: "Cursos",   icon: "fa-solid fa-graduation-cap" },
  { href: "/dashboard/finanzas", label: "Finanzas", icon: "fa-solid fa-coins" },
];

export { navItems };

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside
      className="hidden md:flex w-60 flex-col h-full shrink-0"
      style={{
        background: "var(--surface)",
        borderRight: "1.5px solid var(--border)",
      }}
    >
      {/* ── Logo ───────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-4 flex flex-col items-center gap-1">
        <Image
          src="/LOGO%20LINEAL%20CFF%20(1).png"
          alt="Cook for Friends"
          width={165}
          height={91}
          priority
          style={{ width: "145px", height: "auto" }}
        />
        <p
          className="text-[10px] tracking-[0.2em] uppercase mt-1"
          style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}
        >
          Panel de gestión
        </p>
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl"
              style={{
                color:      active ? "var(--rose)"       : "var(--muted)",
                background: active ? "var(--rose-light)" : "transparent",
                fontWeight: active ? 700 : 500,
                fontFamily: "var(--font-sans)",
                transition: "all 0.15s ease",
                borderLeft: active ? "3px solid var(--rose)" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                  (e.currentTarget as HTMLElement).style.color      = "var(--rose)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color      = "var(--muted)";
                }
              }}
            >
              <span
                className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                style={{
                  background: active ? "var(--rose)"    : "var(--border)",
                  color:      active ? "var(--surface)" : "var(--muted)",
                  transition: "all 0.15s ease",
                  fontSize:   "13px",
                }}
              >
                <i className={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ─────────────────────────────────────── */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl"
          style={{
            color:      "var(--muted)",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            transition: "all 0.15s ease",
            borderLeft: "3px solid transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background  = "#fde8e8";
            (e.currentTarget as HTMLElement).style.color       = "#991b1b";
            (e.currentTarget as HTMLElement).style.borderColor = "#fca5a5";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background  = "transparent";
            (e.currentTarget as HTMLElement).style.color       = "var(--muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
        >
          <span
            className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
            style={{ background: "var(--border)", color: "var(--muted)", fontSize: "13px" }}
          >
            <i className="fa-solid fa-right-from-bracket" />
          </span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
