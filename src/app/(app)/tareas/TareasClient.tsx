"use client";

import { useState, useTransition } from "react";
import { crearTarea, moverTarea, limpiarFinalizadas } from "./actions";

const ACCENT = "#2E6E8E";

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
}: {
  week: WeekDay[];
  tareasIniciales: Tarea[];
  hoyIso: string;
}) {
  const [, startTransition] = useTransition();
  const [tareas, setTareas] = useState(tareasIniciales);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    if (!titulo) return;
    const fecha = hoyIso;
    setNuevaTarea("");
    setError(null);
    startTransition(async () => {
      try {
        const id = await crearTarea({ titulo, fecha });
        setTareas((prev) => [...prev, { id, titulo, fecha, estado: "pendiente" }]);
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

  return (
    <div>
      <div className="flex items-baseline justify-between px-8 pt-7">
        <div>
          <h1 className="font-display text-[22px] font-extrabold text-ink">Tareas</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            Organizá el trabajo semanal del equipo. Usá las flechas de cada tarjeta para pasarla de columna.
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

      {error && (
        <div className="mx-8 mt-4 rounded-[10px] border border-[#F8C6C6] bg-[#FEE2E2] px-4 py-3 text-xs font-bold text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="flex gap-2.5 px-8 pt-[18px]">
        {week.map((day) => {
          const selected = filterDay === day.fecha;
          const style = selected
            ? { background: ACCENT, borderColor: ACCENT }
            : day.isToday
              ? { borderColor: ACCENT }
              : { borderColor: "#E3E5EA" };
          const labelColor = selected ? "#fff" : day.isToday ? ACCENT : "#9AA1AC";
          const numColor = selected ? "#fff" : day.isToday ? ACCENT : "#1C1F27";
          return (
            <button
              key={day.fecha}
              onClick={() => setFilterDay((prev) => (prev === day.fecha ? null : day.fecha))}
              style={style}
              className="flex max-w-[160px] flex-1 flex-col items-center gap-0.5 rounded-[10px] border bg-white px-1.5 py-2.5"
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
              className="flex min-h-[520px] flex-1 flex-col gap-2.5 rounded-2xl border border-line bg-[#FBFBFA] p-3.5"
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
                <div key={t.id} className="rounded-[10px] border border-line bg-white p-3">
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
                <div className="mt-auto flex gap-1.5 pt-1">
                  <input
                    value={nuevaTarea}
                    onChange={(e) => setNuevaTarea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTarea()}
                    placeholder="Nueva tarea…"
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
