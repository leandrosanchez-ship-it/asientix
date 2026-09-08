"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Pantalla, Usuario } from "@/lib/types";
import { LogoutButton } from "./LogoutButton";
import { AsientixIcon } from "./AsientixIcon";
import { ACCENT } from "@/lib/theme";

const TABS: { pantalla: Pantalla; label: string; href: string }[] = [
  { pantalla: "salidas", label: "Salidas", href: "/salidas" },
  { pantalla: "clientes", label: "Clientes", href: "/clientes" },
  { pantalla: "cobros", label: "Cobros", href: "/cobros" },
  { pantalla: "caja", label: "Caja", href: "/caja" },
  { pantalla: "reportes", label: "Reportes", href: "/reportes" },
  { pantalla: "tareas", label: "Tareas", href: "/tareas" },
  { pantalla: "mensajes", label: "Mensajes", href: "/mensajes" },
  { pantalla: "proveedores", label: "Proveedores", href: "/proveedores" },
];

export function NavBar({ usuario }: { usuario: Usuario }) {
  const pathname = usePathname();
  const veTodo = usuario.rol === "superadmin" || usuario.rol === "admin";
  const tabs = veTodo ? TABS : TABS.filter((t) => usuario.permisos.includes(t.pantalla));

  return (
    <div className="flex items-center justify-between border-b border-line bg-white px-8 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: ACCENT }}
        >
          <AsientixIcon size={17} />
        </span>
        <div>
          <div className="font-display text-sm font-extrabold text-ink">Asientix</div>
          <div className="mt-0.5 text-[10px] text-ink-faint">
            Desarrollado por Assertix Software
          </div>
        </div>
      </div>
      <nav className="flex gap-7">
        {tabs.map((tab) => {
          const activo = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.pantalla}
              href={tab.href}
              className={
                activo
                  ? "border-b-2 border-accent pb-1 text-[13px] font-bold text-accent"
                  : "text-[13px] font-bold text-ink-soft hover:text-ink"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-ink-soft">{usuario.nombre}</span>
        <LogoutButton className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-app" />
      </div>
    </div>
  );
}
