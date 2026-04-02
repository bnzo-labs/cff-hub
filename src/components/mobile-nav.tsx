"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard",          label: "Resumen",  icon: "fa-solid fa-chart-line" },
  { href: "/dashboard/pedidos",  label: "Pedidos",  icon: "fa-solid fa-bag-shopping" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "fa-solid fa-users" },
  { href: "/dashboard/cursos",   label: "Cursos",   icon: "fa-solid fa-graduation-cap" },
  { href: "/dashboard/finanzas", label: "Finanzas", icon: "fa-solid fa-coins" },
  { href: "/dashboard/redes",   label: "Redes",    icon: "fa-solid fa-hashtag" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
        style={{
          height: 56,
          background: "var(--surface)",
          borderBottom: "1.5px solid var(--border)",
          boxShadow: "0 2px 8px rgba(157,36,178,0.06)",
        }}
      >
        <Image
          src="/LOGO%20LINEAL%20CFF%20(1).png"
          alt="Cook for Friends"
          width={110}
          height={60}
          priority
          style={{ width: "90px", height: "auto" }}
        />
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 10,
            background: "var(--surface-2)",
            border: "1.5px solid var(--border)",
            color: "var(--muted)",
            fontSize: 16,
          }}
          aria-label="Abrir menú"
        >
          <i className="fa-solid fa-bars" />
        </button>
      </header>

      {/* ── Backdrop ─────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Drawer ───────────────────────────────────────── */}
      <aside
        className="md:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 260,
          background: "var(--surface)",
          borderRight: "1.5px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          boxShadow: open ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <Image
            src="/LOGO%20LINEAL%20CFF%20(1).png"
            alt="Cook for Friends"
            width={130}
            height={70}
            style={{ width: "110px", height: "auto" }}
          />
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8,
              background: "var(--surface-2)",
              border: "1.5px solid var(--border)",
              color: "var(--muted)",
              fontSize: 14,
            }}
            aria-label="Cerrar menú"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl"
                style={{
                  color:      active ? "var(--rose)"       : "var(--muted)",
                  background: active ? "var(--rose-light)" : "transparent",
                  fontWeight: active ? 700 : 500,
                  fontFamily: "var(--font-sans)",
                  borderLeft: active ? "3px solid var(--rose)" : "3px solid transparent",
                }}
              >
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                  style={{
                    background: active ? "var(--rose)"    : "var(--border)",
                    color:      active ? "var(--surface)" : "var(--muted)",
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

        {/* Logout */}
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl"
            style={{
              color:      "var(--muted)",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              borderLeft: "3px solid transparent",
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
    </>
  );
}
