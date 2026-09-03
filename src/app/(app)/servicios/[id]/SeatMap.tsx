"use client";

import type { Asiento, Cliente } from "@/lib/types";

export interface SeatVM {
  asiento: Asiento;
  cliente: Cliente | null;
  esResponsable: boolean;
}

type Cell =
  | { type: "seat"; numero: number; wide?: boolean }
  | { type: "amenity"; label: string; wide?: boolean }
  | { type: "gap" };

const s = (numero: number): Cell => ({ type: "seat", numero });
const sw = (numero: number): Cell => ({ type: "seat", numero, wide: true });
const a = (label: string, wide = false): Cell => ({ type: "amenity", label, wide });
const g = (): Cell => ({ type: "gap" });

// Mismo layout físico real del coche que en Main.dc.html — no correlativo,
// respeta la numeración que ya usa la agencia.
const SUPERIOR_ROWS: Cell[][] = [
  [s(13), s(12), g(), s(10), s(11)],
  [s(15), s(14), g(), a("Escalera", true)],
  [s(17), s(16), g(), a("Café", true)],
  [s(19), s(18), g(), s(20), s(21)],
  [s(23), s(22), g(), s(24), s(25)],
  [s(27), s(26), g(), s(28), s(29)],
  [s(31), s(30), g(), s(32), s(33)],
  [s(35), s(34), g(), s(36), s(37)],
  [s(39), s(38), g(), s(40), s(41)],
  [s(43), s(42), g(), s(44), s(45)],
  [s(47), s(46), g(), s(48), s(49)],
  [s(51), s(50), g(), s(52), s(53)],
  [s(55), s(54), g(), s(60), s(59)],
];

const INFERIOR_ROWS: Cell[][] = [
  [a("Puerta", true), g(), a("", true)],
  [a("TV", true), g(), a("Puerta", true)],
  [s(1), s(2), g(), sw(3)],
  [s(4), s(5), g(), sw(6)],
  [s(7), s(8), g(), sw(9)],
  [s(57), s(58), g(), sw(56)],
];

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
