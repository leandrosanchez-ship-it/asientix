"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarCaja } from "./actions";

const ACCENT = "#2E6E8E";

export interface Movimiento {
  hora: string;
  pasajero: string;
  medio: string;
  monto: number;
}

export interface Cierre {
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function fmtDif(n: number) {
  if (n === 0) return fmt(0);
  return (n > 0 ? "+" : "−") + fmt(Math.abs(n));
}

export function CajaClient({
  fechaHoy,
  total,
  efectivo,
  transferencia,
  tarjeta,
  movimientos,
  cierre,
}: {
  fechaHoy: string;
  total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  movimientos: Movimiento[];
  cierre: Cierre | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contado, setContado] = useState(cierre ? String(cierre.efectivoContado) : "");
  const [error, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState(!!cierre);

  const contadoNum = parseFloat(contado);
  const hasContado = contado !== "" && !isNaN(contadoNum);
  const diferencia = cerrado && cierre ? cierre.diferencia : hasContado ? contadoNum - efectivo : null;

  function handleCerrar() {
    if (!hasContado) return;
    setError(null);
    startTransition(async () => {
      try {
        await cerrarCaja({ efectivoEsperado: efectivo, efectivoContado: contadoNum });
        setCerrado(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  return (
    <div>
      <div className="px-8 pt-7">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Caja diaria</h1>
        <p className="mt-1 text-[13px] text-ink-soft">{fechaHoy} · arqueo simple de lo cobrado en el día.</p>
      </div>

      <div className="grid grid-cols-4 gap-3.5 px-8 pt-[22px]">
        <KpiCard label="Total cobrado hoy" value={fmt(total)} />
        <KpiCard label="Efectivo" value={fmt(efectivo)} />
        <KpiCard label="Transferencia" value={fmt(transferencia)} />
        <KpiCard label="Tarjeta" value={fmt(tarjeta)} />
      </div>

      <div className="flex items-start gap-[18px] px-8 py-5">
        <div className="flex-[1.4] overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-5 py-4 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            Movimientos de hoy
          </div>
          <div className="grid grid-cols-[0.8fr_1.6fr_1fr_1fr] gap-2 border-b border-line bg-app px-5 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Hora</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Pasajero</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Medio</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Monto</div>
          </div>
          {movimientos.map((m, i) => (
            <div key={i} className="grid grid-cols-[0.8fr_1.6fr_1fr_1fr] items-center gap-2 border-t border-[#EEF0F2] px-5 py-3 text-[13px]">
              <div className="text-[#4B5563]">{m.hora}</div>
              <div className="font-semibold text-ink">{m.pasajero}</div>
              <div className="text-[#4B5563]">{m.medio}</div>
              <div className="font-bold text-ink">{fmt(m.monto)}</div>
            </div>
          ))}
          {movimientos.length === 0 && (
            <div className="px-5 py-11 text-center text-[13px] text-ink-faint">Todavía no se registró ningún cobro hoy.</div>
          )}
        </div>

        <div className="flex-1 rounded-2xl border border-line bg-white p-[22px]">
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
            Arqueo de efectivo
          </div>

          <div className="flex justify-between border-b border-[#EEF0F2] pb-3">
            <div className="text-[13px] text-ink-soft">Efectivo esperado</div>
            <div className="text-[14px] font-bold text-ink">{fmt(efectivo)}</div>
          </div>

          <div className="mt-3.5">
            <div className="mb-1.5 text-xs text-ink-soft">Efectivo contado</div>
            <input
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              placeholder="$ 0"
              disabled={cerrado}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-accent disabled:bg-app"
            />
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-[#EEF0F2] pt-3.5">
            <div className="text-[13px] font-bold text-ink">Diferencia</div>
            <div
              className="text-[17px] font-extrabold"
              style={{ color: diferencia === null ? "#9AA1AC" : diferencia === 0 ? "#15803D" : "#B91C1C" }}
            >
              {diferencia === null ? "—" : fmtDif(diferencia)}
            </div>
          </div>

          {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}

          <button
            onClick={handleCerrar}
            disabled={!hasContado || isPending || cerrado}
            style={{ background: ACCENT }}
            className="mt-5 w-full rounded-[10px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
          >
            {isPending ? "Cerrando…" : cerrado ? "Caja cerrada" : "Cerrar caja"}
          </button>

          {cerrado && (
            <div className="mt-3 rounded-lg border border-[#BBF0CE] bg-[#DCFCE7] px-3 py-2.5 text-center text-xs font-bold text-[#15803D]">
              ✓ Caja cerrada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-[18px] py-4">
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1.5 text-xl font-extrabold text-ink">{value}</div>
    </div>
  );
}
