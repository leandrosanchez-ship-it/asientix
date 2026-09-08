"use client";

import type { Asiento, Cliente } from "@/lib/types";
import { SUPERIOR_ROWS, INFERIOR_ROWS, type SeatCell as Cell } from "@/lib/seat-layout";

export interface SeatVM {
  asiento: Asiento;
  cliente: Cliente | null;
  esResponsable: boolean;
}

function seatStyle(seat: SeatVM | undefined, enCarrito: boolean) {
  if (enCarrito) {
    return { bg: "#DBEAFE", border: "#2563EB", color: "#1D4ED8" };
  }
  switch (seat?.asiento.estado) {
    case "ocupado":
      return { bg: "#FEE2E2", border: "#EF4444", color: "#B91C1C" };
    case "pendiente":
      return { bg: "#FEF3C7", border: "#F59E0B", color: "#92400E" };
    default:
      return { bg: "#DCFCE7", border: "#22C55E", color: "#15803D" };
  }
}

function seatLabel(seat: SeatVM | undefined, numero: number, enCarrito: boolean) {
  if (enCarrito) return `✓ ${numero}`;
  if (!seat || seat.asiento.estado === "libre") return String(numero);
  const apellido = seat.cliente?.apellido.toUpperCase() ?? "";
  return seat.esResponsable ? `★ ${apellido}` : apellido;
}

function Grid({
  rows,
  seatsByNumero,
  cartSet,
  onSeatClick,
}: {
  rows: Cell[][];
  seatsByNumero: Map<number, SeatVM>;
  cartSet: Set<number>;
  onSeatClick: (numero: number) => void;
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-2.5">
          {row.map((cell, j) => {
            if (cell.type === "gap") {
              return <div key={j} className="w-[26px]" />;
            }
            const width = cell.wide ? "134px" : "62px";
            if (cell.type === "amenity") {
              return (
                <div
                  key={j}
                  style={{ width }}
                  className="flex h-14 items-center justify-center rounded-[10px] border border-dashed border-[#C7CBD1] bg-[#FBFBFA] text-center text-[10px] font-bold text-ink-soft"
                >
                  {cell.label}
                </div>
              );
            }
            const seat = seatsByNumero.get(cell.numero);
            const enCarrito = cartSet.has(cell.numero);
            const { bg, border, color } = seatStyle(seat, enCarrito);
            return (
              <button
                key={j}
                type="button"
                style={{ width, background: bg, borderColor: border, color }}
                onClick={() => onSeatClick(cell.numero)}
                className="flex h-14 items-center justify-center overflow-hidden rounded-[10px] border-2 px-1 text-center text-[10px] font-bold leading-tight"
              >
                {seatLabel(seat, cell.numero, enCarrito)}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function SeatMap({
  piso,
  seatsByNumero,
  cartSet,
  onSeatClick,
  accent,
}: {
  piso: "superior" | "inferior";
  seatsByNumero: Map<number, SeatVM>;
  cartSet: Set<number>;
  onSeatClick: (numero: number) => void;
  accent: string;
}) {
  return (
    <div className="flex w-[420px] flex-col gap-2.5 rounded-[20px] border border-line bg-white p-[26px] shadow-sm">
      <div
        style={{ background: accent }}
        className="rounded-[10px] p-2 text-center text-xs font-extrabold uppercase tracking-wide text-white"
      >
        Frente
      </div>

      <div className="mt-1 flex justify-center gap-2.5">
        <div className="w-[134px] text-center text-[11px] font-extrabold uppercase tracking-wide text-[#B4592A]">
          Calle
        </div>
        <div className="w-[26px]" />
        <div className="w-[134px] text-center text-[11px] font-extrabold uppercase tracking-wide text-[#B4592A]">
          Vereda
        </div>
      </div>
      <div className="mb-1 flex justify-center gap-2.5">
        <div className="w-[62px] text-center text-[9px] font-bold uppercase text-ink-faint">
          Ventana
        </div>
        <div className="w-[62px] text-center text-[9px] font-bold uppercase text-ink-faint">
          Pasillo
        </div>
        <div className="w-[26px]" />
        <div className="w-[62px] text-center text-[9px] font-bold uppercase text-ink-faint">
          Pasillo
        </div>
        <div className="w-[62px] text-center text-[9px] font-bold uppercase text-ink-faint">
          Ventana
        </div>
      </div>

      <Grid
        rows={piso === "superior" ? SUPERIOR_ROWS : INFERIOR_ROWS}
        seatsByNumero={seatsByNumero}
        cartSet={cartSet}
        onSeatClick={onSeatClick}
      />

      {piso === "inferior" && (
        <div className="rounded-[10px] border border-dashed border-[#C7CBD1] bg-[#FBFBFA] p-2 text-center text-[11px] font-bold text-ink-soft">
          Café
        </div>
      )}

      <div
        style={{ background: accent }}
        className="mt-1 rounded-[10px] p-2 text-center text-xs font-extrabold uppercase tracking-wide text-white"
      >
        Fondo
      </div>
    </div>
  );
}
