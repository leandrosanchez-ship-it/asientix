"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface ClienteConViajes {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  viajes: number;
  ultimoViaje: string | null; // ISO date, o null si nunca viajó
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ClientesClient({ clientes }: { clientes: ClienteConViajes[] }) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const nombreCompleto = `${c.apellido} ${c.nombre}`.toLowerCase();
      return nombreCompleto.includes(q) || c.dni.toLowerCase().includes(q);
    });
  }, [clientes, query]);

  return (
    <div>
      <div className="px-8 pt-8">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Base de datos de clientes</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Buscá un pasajero ya cargado y reutilizá sus datos en una nueva reserva, sin volver a tipearlos.
        </p>
      </div>

      <div className="px-8 pt-5">
        <div className="relative w-[380px] max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o DNI…"
            className="w-full rounded-[10px] border border-line bg-white py-2.5 pl-[38px] pr-3.5 text-[13px] outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="px-8 py-5">
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr_1.1fr_0.7fr_1.2fr] gap-2 border-b border-line bg-app px-5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Nombre</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">DNI</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Teléfono</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Último viaje</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Viajes</div>
            <div />
          </div>

          {filtrados.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[2fr_1fr_1fr_1.1fr_0.7fr_1.2fr] items-center gap-2 border-b border-[#EEF0F2] px-5 py-3.5"
            >
              <div className="text-[13px] font-semibold text-ink">
                {c.apellido}, {c.nombre}
              </div>
              <div className="text-[13px] text-[#4B5563]">{c.dni || "—"}</div>
              <div className="text-[13px] text-[#4B5563]">{c.telefono || "—"}</div>
              <div className="text-[13px] text-[#4B5563]">{formatFecha(c.ultimoViaje)}</div>
              <div className="text-[13px] text-[#4B5563]">{c.viajes}</div>
              <div className="text-right">
                <Link
                  href="/salidas"
                  className="whitespace-nowrap rounded-lg border border-accent px-3 py-1.5 text-xs font-bold text-accent"
                >
                  Usar en nueva reserva
                </Link>
              </div>
            </div>
          ))}

          {filtrados.length === 0 && (
            <div className="px-5 py-11 text-center text-[13px] text-ink-faint">
              {clientes.length === 0
                ? "Todavía no hay clientes cargados — aparecen automáticamente al hacer la primera reserva."
                : "No se encontraron clientes con esos datos."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
