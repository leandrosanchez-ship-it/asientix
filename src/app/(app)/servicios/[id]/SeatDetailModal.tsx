"use client";

import Link from "next/link";
import type { Cliente } from "@/lib/types";

export interface GrupoInfo {
  cantidad: number;
  asientos: number[];
  responsableNombre: string | null;
  habitacionLabel: string | null;
}

const HABITACION_LABELS: Record<string, string> = {
  single: "single",
  doble: "doble",
  triple: "triple",
  cuadruple: "cuádruple",
};

export function habitacionLabel(tipo: string | null) {
  if (!tipo) return null;
  return HABITACION_LABELS[tipo] ?? tipo;
}

export function SeatDetailModal({
  numero,
  cliente,
  saldo,
  precioTotal,
  grupo,
  accent,
  servicioId,
  reservaPasajeroId,
  onClose,
  onMarcarPagado,
  onDescargarBoleto,
}: {
  numero: number;
  cliente: Cliente;
  saldo: number;
  precioTotal: number;
  grupo: GrupoInfo | null;
  accent: string;
  servicioId: string;
  reservaPasajeroId: string;
  onClose: () => void;
  onMarcarPagado: () => void;
  onDescargarBoleto: () => void;
}) {
  const pagado = saldo <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-0 py-12">
      <div className="max-h-full w-[480px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-[18px] flex items-start justify-between">
          <h2 className="text-[17px] font-extrabold text-ink">
            Asiento {numero} · Ficha del pasajero
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft"
          >
            ✕
          </button>
        </div>

        {grupo && (
          <div className="mb-3.5 rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-3">
            <div className="text-[11px] font-bold uppercase text-[#1D4ED8]">
              Reserva grupal · {grupo.cantidad} asientos
            </div>
            <div className="mt-0.5 text-[13px] text-[#1E3A8A]">
              Asientos {grupo.asientos.join(", ")} · responsable:{" "}
              <strong>{grupo.responsableNombre ?? "—"}</strong>
            </div>
            {grupo.habitacionLabel && (
              <div className="mt-0.5 text-[13px] text-[#1E3A8A]">
                Hotel: <strong>Habitación {grupo.habitacionLabel}</strong>
              </div>
            )}
          </div>
        )}

        <div
          className="mb-[18px] flex items-center justify-between gap-3 rounded-[10px] px-4 py-3.5"
          style={{
            background: pagado ? "#DCFCE7" : "#FEF3C7",
            border: `1px solid ${pagado ? "#BBF0CE" : "#FBE0A0"}`,
          }}
        >
          <div>
            <div
              className="text-[11px] font-bold uppercase"
              style={{ color: pagado ? "#15803D" : "#92400E" }}
            >
              {pagado ? "Pagado en su totalidad" : "Saldo pendiente"}
            </div>
            <div className="mt-0.5 text-sm font-extrabold" style={{ color: pagado ? "#15803D" : "#92400E" }}>
              {pagado ? `$${precioTotal.toLocaleString("es-AR")} · pasaje completo` : `$${saldo.toLocaleString("es-AR")}`}
            </div>
          </div>
          {pagado ? (
            <button
              type="button"
              onClick={onDescargarBoleto}
              className="whitespace-nowrap rounded-lg border border-[#15803D] px-3.5 py-2 text-xs font-bold text-[#15803D]"
            >
              Descargar boleto
            </button>
          ) : (
            <button
              type="button"
              onClick={onMarcarPagado}
              style={{ background: accent }}
              className="whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold text-white"
            >
              Marcar como pagado
            </button>
          )}
        </div>

        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          Datos básicos
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ReadField label="Nombre" value={cliente.nombre} />
          <ReadField label="Apellido" value={cliente.apellido} />
          <ReadField label="DNI" value={cliente.dni} />
          <ReadField label="Teléfono" value={cliente.telefono} />
        </div>

        {(cliente.emerNombre || cliente.emerParentesco) && (
          <>
            <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
              Contacto de emergencia
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ReadField label="Nombre y apellido" value={cliente.emerNombre || "—"} />
              <ReadField label="Parentesco" value={cliente.emerParentesco || "—"} />
            </div>
          </>
        )}

        <Link
          href={`/servicios/${servicioId}/pasajero/${reservaPasajeroId}`}
          className="mt-[22px] block w-full rounded-lg border border-[#F8C6C6] px-3.5 py-2.5 text-center text-xs font-bold text-[#B91C1C]"
        >
          Cancelar / reprogramar
        </Link>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-[#F7F8F7] px-2.5 py-2">
      <div className="text-[10px] uppercase text-ink-faint">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink">{value}</div>
    </div>
  );
}
