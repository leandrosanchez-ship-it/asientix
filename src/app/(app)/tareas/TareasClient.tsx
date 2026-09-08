"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearTarea, moverTarea, limpiarFinalizadas } from "./actions";
import { Toast } from "@/components/Toast";
import { ACCENT } from "@/lib/theme";

export type EstadoTarea = "pendiente" | "en_progreso" | "finalizada";

export interface Tarea {
  id: string;
  titulo: string;
  fecha: string; // ISO yyyy-mm-dd
  estado: EstadoTarea;
}

export interface WeekDay {
  fecha: string;
  label: string;
  num: number;
  isToday: boolean;
}

const COLUMNAS: { estado: EstadoTarea; nombre: string; badgeBg: string; badgeColor: string }[] = [
  { estado: "pendiente", nombre: "Pendientes", badgeBg: "#EEF0F2", badgeColor: "#6B7280" },
  { estado: "en_progreso", nombre: "En progreso", badgeBg: "#FEF3C7", badgeColor: "#92400E" },
  { estado: "finalizada", nombre: "Finalizadas", badgeBg: "#DCFCE7", badgeColor: "#15803D" },
];

function ArrowLeft() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function TareasClient({
  week,
  tareasIniciales,
  hoyIso,
  rangoLabel,
  esSemanaActual,
  semanaAnteriorIso,
  semanaSiguienteIso,
}: {
  week: WeekDay[];
  tareasIniciales: Tarea[];
  hoyIso: string;
  rangoLabel: string;
  esSemanaActual: boolean;
  semanaAnteriorIso: string;
  semanaSiguienteIso: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tareas, setTareas] = useState(tareasIniciales);
  // Por default arranca en el día de hoy si está en la semana visible —
  // si se navegó a otra semana (no hay isToday acá), no filtra por día.
  const [filterDay, setFilterDay] = useState<string | null>(
    () => week.find((d) => d.isToday)?.fecha ?? null,
  );
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(week[0]?.fecha ?? hoyIso);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function irASemana(fechaIso: string) {
    router.push(`/tareas?semana=${fechaIso}`);
  }

  const diaLabel = (fecha: string) => {
    const d = week.find((w) => w.fecha === fecha);
    return d ? `${d.label} ${d.num}` : fecha;
  };

  function moveTask(id: string, dir: -1 | 1) {
    const idx = COLUMNAS.findIndex((c) => c.estado === tareas.find((t) => t.id === id)?.estado);
    const nextIdx = Math.max(0, Math.min(2, idx + dir));
    const nuevoEstado = COLUMNAS[nextIdx].estado;
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t)));
    startTransition(async () => {
      try {
        await moverTarea({ id, estado: nuevoEstado });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function addTarea() {
    const titulo = nuevaTarea.trim();
    if (!titulo || !nuevaFecha) return;
    const fecha = nuevaFecha;
    setNuevaTarea("");
    setError(null);
    startTransition(async () => {
      try {
        const id = await crearTarea({ titulo, fecha });
        // Si la fecha elegida cae fuera de la semana que se está mostrando,
        // igual queda guardada — solo no aparece en este tablero hasta
        // navegar a esa semana.
        const enSemanaVisible = week.some((d) => d.fecha === fecha);
        if (enSemanaVisible) {
          setTareas((prev) => [...prev, { id, titulo, fecha, estado: "pendiente" }]);
        } else {
          setError(null);
          setToast(`✓ Tarea creada para el ${new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR")}.`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function clearFinished() {
    const idsVisibles = visibleTasks.filter((t) => t.estado === "finalizada").map((t) => t.id);
    if (idsVisibles.length === 0) return;
    setTareas((prev) => prev.filter((t) => !idsVisibles.includes(t.id)));
    startTransition(async () => {
      try {
        await limpiarFinalizadas({ ids: idsVisibles });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  const visibleTasks = tareas.filter((t) => filterDay === null || t.fecha === filterDay);
  const hasFinished = visibleTasks.some((t) => t.estado === "finalizada");

  // Días (de la semana visible) con tareas sin finalizar que ya quedaron
  // atrás — su recuadro parpadea para llamar la atención sobre pendientes.
  const diasConAtraso = new Set(
    tareas.filter((t) => t.fecha < hoyIso && t.estado !== "finalizada").map((t) => t.fecha),
  );

  return (
    <div>
      <div className="flex items-baseline justify-between px-8 pt-7">
        <div>
          <h1 className="font-display text-[22px] font-extrabold text-ink">Tareas</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            Organizá el trabajo semanal del equipo. Navegá entre semanas y elegí la fecha para dejar tareas
            cargadas de antemano.
          </p>
        </div>
        <button
          type="button"
          onClick={clearFinished}
          style={{ opacity: hasFinished ? 1 : 0.5 }}
          className="whitespace-nowrap rounded-[10px] border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink-soft"
        >
          Limpiar finalizadas
        </button>
      </div>

      <div className="flex items-center justify-between px-8 pt-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => irASemana(semanaAnteriorIso)}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-white text-ink-soft"
            aria-label="Semana anterior"
          >
            <ArrowLeft />
          </button>
          <div className="min-w-[190px] text-center text-[13px] font-bold text-ink">{rangoLabel}</div>
          <button
            type="button"
            onClick={() => irASemana(semanaSiguienteIso)}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-white text-ink-soft"
            aria-label="Semana siguiente"
          >
            <ArrowRight />
          </button>
        </div>
        {!esSemanaActual && (
          <button
            type="button"
            onClick={() => irASemana(hoyIso)}
            style={{ color: ACCENT, borderColor: ACCENT }}
            className="rounded-[9px] border bg-white px-3 py-1.5 text-xs font-bold"
          >
            Volver a esta semana
          </button>
        )}
      </div>

      {error && (
        <div className="mx-8 mt-4 rounded-[10px] border border-[#F8C6C6] bg-[#FEE2E2] px-4 py-3 text-xs font-bold text-[#B91C1C]">
          {error}
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex gap-2.5 px-8 pt-[18px]">
        {week.map((day) => {
          const selected = filterDay === day.fecha;
          const atrasado = diasConAtraso.has(day.fecha);
          const style = selected
            ? { background: ACCENT, borderColor: ACCENT }
            : atrasado
              ? { background: "#FEF3C7", borderColor: "#F59E0B", borderWidth: 1.5 }
              : day.isToday
                ? { borderColor: ACCENT, borderWidth: 1.5 }
                : { borderColor: "#CBD8D5" };
          const labelColor = selected ? "#fff" : atrasado ? "#92400E" : day.isToday ? ACCENT : "#5C7A78";
          const numColor = selected ? "#fff" : atrasado ? "#92400E" : day.isToday ? ACCENT : "#12292E";
          return (
            <button
              key={day.fecha}
              onClick={() => {
                setFilterDay((prev) => (prev === day.fecha ? null : day.fecha));
                setNuevaFecha(day.fecha);
              }}
              style={style}
              title={atrasado ? "Quedaron tareas sin finalizar de este día" : undefined}
              className={`flex max-w-[160px] flex-1 flex-col items-center gap-0.5 rounded-[10px] border bg-white px-1.5 py-2.5 ${atrasado ? "animate-pulse" : ""}`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: labelColor }}>
                {day.label}
              </div>
              <div className="text-[15px] font-extrabold" style={{ color: numColor }}>
                {day.num}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-4 px-8 py-5">
        {COLUMNAS.map((col, ci) => {
          const tareasCol = visibleTasks.filter((t) => t.estado === col.estado);
          return (
            <div
              key={col.estado}
              className="flex min-h-[520px] flex-1 flex-col gap-2.5 rounded-2xl border border-[#D2E1DE] bg-[#EDF3F2] p-3.5 shadow-[0_1px_2px_rgba(18,41,46,0.05)]"
            >
              <div className="flex items-center justify-between px-1 pb-1.5 pt-0.5">
                <div className="text-[13px] font-extrabold text-ink">{col.nombre}</div>
                <div
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: col.badgeBg, color: col.badgeColor }}
                >
                  {tareasCol.length}
                </div>
              </div>

              {tareasCol.map((t) => (
                <div key={t.id} className="rounded-[10px] border border-[#C9D9D6] bg-white p-3 shadow-[0_1px_3px_rgba(18,41,46,0.08)]">
                  <div className="text-[13px] font-semibold leading-snug text-ink">{t.titulo}</div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="rounded-full bg-app px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                      {diaLabel(t.fecha)}
                    </span>
                    <div className="flex gap-1.5">
                      {ci > 0 && (
                        <button
                          onClick={() => moveTask(t.id, -1)}
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-line bg-white text-ink-soft"
                        >
                          <ArrowLeft />
                        </button>
                      )}
                      {ci < 2 && (
                        <button
                          onClick={() => moveTask(t.id, 1)}
                          style={{ background: ACCENT, borderColor: ACCENT }}
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border text-white"
                        >
                          <ArrowRight />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {tareasCol.length === 0 && (
                <div className="px-1 py-4 text-center text-xs text-ink-faint">Sin tareas acá.</div>
              )}

              {ci === 0 && (
                <div className="mt-auto flex flex-col gap-1.5 pt-1">
                  <input
                    value={nuevaTarea}
                    onChange={(e) => setNuevaTarea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTarea()}
                    placeholder="Nueva tarea…"
                    className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs outline-none focus:border-accent"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) => setNuevaFecha(e.target.value)}
                      className="flex-1 rounded-lg border border-line bg-white px-2.5 py-2 text-xs outline-none focus:border-accent"
                    />
                    <button
                      onClick={addTarea}
                      style={{ background: ACCENT }}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                    >
                      +
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
