"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eliminarServicio } from "../servicios/[id]/actions";
import { Toast } from "@/components/Toast";

export interface SalidaRow {
  id: string;
  origen: string;
  destino: string;
  fechaLabel: string;
  hora: string;
  tipoCoche: string;
  vendidos: number;
  total: number;
  puedeEliminar: boolean;
}

export function SalidasClient({ salidasIniciales }: { salidasIniciales: SalidaRow[] }) {
  const router = useRouter();
  const [salidas, setSalidas] = useState(salidasIniciales);
  const [, startTransition] = useTransition();
  const [confirmarId, setConfirmarId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function eliminar(row: SalidaRow) {
    setConfirmarId(null);
    setSalidas((prev) => prev.filter((s) => s.id !== row.id));
    startTransition(async () => {
      try {
        await eliminarServicio(row.id);
        setToast(`✓ Se eliminó ${row.origen} → ${row.destino} y todo lo asociado.`);
        router.refresh();
      } catch (e) {
        setSalidas(salidasIniciales);
        setToast(`✕ ${e instanceof Error ? e.message : "No se pudo eliminar"}`);
      }
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between px-8 pt-8">
        <div>
          <h1 className="font-display text-[22px] font-extrabold text-ink">Próximas salidas</h1>
          <p className="mt-1 text-[13px] text-ink-soft">Elegí un servicio para ver y cargar el mapa de asientos.</p>
        </div>
        <Link
          href="/servicios/nuevo"
          className="whitespace-nowrap rounded-[10px] bg-accent px-[18px] py-2.5 text-[13px] font-bold text-white"
        >
          + Nuevo servicio
        </Link>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-3.5 px-8 py-6">
        {salidas.length === 0 && (
          <div className="rounded-[14px] border border-line bg-white px-6 py-10 text-center text-[13px] text-ink-soft">
            Todavía no hay servicios cargados —{" "}
            <Link href="/servicios/nuevo" className="font-bold text-accent">
              creá el primero
            </Link>
            .
          </div>
        )}
        {salidas.map((s) => {
          const pct = s.total > 0 ? Math.round((s.vendidos / s.total) * 100) : 0;
          const confirmando = confirmarId === s.id;
          return (
            <div key={s.id} className="overflow-hidden rounded-[14px] border border-line bg-white">
              <div className="flex items-center justify-between gap-6 px-6 py-5">
                <div className="flex-[1.4]">
                  <div className="text-base font-bold text-ink">
                    {s.origen} → {s.destino}
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-soft">
                    {s.fechaLabel} · {s.hora} hs · {s.tipoCoche}
                  </div>
                </div>
                <div className="w-[220px]">
                  <div className="mb-1.5 text-xs text-ink-soft">
                    {s.vendidos} / {s.total} vendidos
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F2]">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/servicios/${s.id}`}
                    className="whitespace-nowrap rounded-[10px] border border-accent px-[18px] py-2.5 text-[13px] font-bold text-accent"
                  >
                    Ver mapa de asientos →
                  </Link>
                  {s.puedeEliminar && (
                    <button
                      type="button"
                      onClick={() => setConfirmarId(s.id)}
                      title="Eliminar este servicio"
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#F8C6C6] text-[#B91C1C]"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
              {confirmando && (
                <div className="flex items-center justify-between gap-3 border-t border-[#F8C6C6] bg-[#FEE2E2] px-6 py-3">
                  <span className="text-[12.5px] font-semibold text-[#B91C1C]">
                    ¿Eliminar {s.origen} → {s.destino}? Se borran sus asientos, reservas, pasajeros y pagos — no se
                    puede deshacer.
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setConfirmarId(null)}
                      className="whitespace-nowrap rounded-[7px] border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink-soft"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => eliminar(s)}
                      className="whitespace-nowrap rounded-[7px] bg-[#B91C1C] px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
