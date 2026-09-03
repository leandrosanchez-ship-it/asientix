"use client";

import { useState } from "react";
import type { AsistenciaViajero, Hotel, Observacion, TipoHabitacion } from "@/lib/types";

const ACCENT = "#2E6E8E";
const TIPOS_COCHE = ["Comun", "Semi-Cama", "Cama", "Ejecutivo"];
const HABITACIONES: { value: TipoHabitacion; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "doble", label: "Doble" },
  { value: "triple", label: "Triple" },
  { value: "cuadruple", label: "Cuádruple" },
];

interface Form {
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  tipo: string;
  unidad: string;
  asientos: string;
  precio: string;
  hotelId: string;
  asistenciaId: string;
}

function emptyForm(): Form {
  return {
    origen: "Villa Carlos Paz",
    destino: "",
    fecha: "",
    hora: "",
    tipo: "Semi-Cama",
    unidad: "",
    asientos: "40",
    precio: "",
    hotelId: "",
    asistenciaId: "",
  };
}

function Check({ checked, filled }: { checked: boolean; filled?: boolean }) {
  return checked ? (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]"
      style={{ background: ACCENT }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  ) : (
    <span
      className="h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px]"
      style={{ borderColor: "#C7CBD1", background: filled ? "#fff" : undefined }}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-ink-soft">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-accent"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
      {children}
    </div>
  );
}

export function NuevoServicioClient({
  hoteles,
  asistencias,
  observaciones,
}: {
  hoteles: Hotel[];
  asistencias: AsistenciaViajero[];
  observaciones: Observacion[];
}) {
  const [form, setForm] = useState<Form>(emptyForm());
  const [incluyeHotel, setIncluyeHotel] = useState(false);
  const [incluyeAsistencia, setIncluyeAsistencia] = useState(false);
  const [selectedObs, setSelectedObs] = useState<string[]>([]);
  const [selectedHab, setSelectedHab] = useState<TipoHabitacion[]>([]);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleObs(id: string) {
    setSelectedObs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleHab(v: TipoHabitacion) {
    setSelectedHab((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  function reset() {
    setForm(emptyForm());
    setIncluyeHotel(false);
    setIncluyeAsistencia(false);
    setSelectedObs([]);
    setSelectedHab([]);
    setSaved(false);
  }

  const canSave = !!(form.destino && form.fecha);

  function save() {
    if (!canSave) return;
    // TODO: insert real en `servicios` (+ generar sus `asientos`) al conectar Supabase.
    setSaved(true);
  }

  return (
    <div className="px-8 py-7">
      <h1 className="font-display text-[22px] font-extrabold text-ink">Nuevo servicio</h1>
      <p className="mt-1 text-[13px] text-ink-soft">
        Cargá una nueva salida para que aparezca en el listado y se pueda empezar a vender.
      </p>

      <div className="mt-[22px] max-w-[640px] rounded-2xl border border-line bg-white p-[26px]">
        <SectionLabel>Ruta y horario</SectionLabel>
        <div className="mb-[22px] grid grid-cols-2 gap-3.5">
          <Field label="Origen" value={form.origen} onChange={(v) => setField("origen", v)} />
          <Field label="Destino" value={form.destino} onChange={(v) => setField("destino", v)} placeholder="Ej. Rosario" />
          <Field label="Fecha de salida" value={form.fecha} onChange={(v) => setField("fecha", v)} type="date" />
          <Field label="Hora de salida" value={form.hora} onChange={(v) => setField("hora", v)} type="time" />
        </div>

        <SectionLabel>Vehículo y capacidad</SectionLabel>
        <div className="mb-[22px] grid grid-cols-2 gap-3.5">
          <div>
            <div className="mb-1 text-xs text-ink-soft">Tipo de coche</div>
            <select
              value={form.tipo}
              onChange={(e) => setField("tipo", e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-accent"
            >
              {TIPOS_COCHE.map((t) => (
                <option key={t} value={t}>
                  {t === "Comun" ? "Común" : t}
                </option>
              ))}
            </select>
          </div>
          <Field label="Unidad / coche" value={form.unidad} onChange={(v) => setField("unidad", v)} placeholder="Ej. Coche 12" />
          <Field label="Cantidad de asientos" value={form.asientos} onChange={(v) => setField("asientos", v)} placeholder="40" />
          <Field label="Precio del pasaje" value={form.precio} onChange={(v) => setField("precio", v)} placeholder="$ 45.000" />
        </div>

        <SectionLabel>Servicios adicionales</SectionLabel>
        <div className="mb-[22px] flex flex-col gap-3">
          {/* Hotel */}
          <div className="rounded-[10px] border border-line p-3.5">
            <button
              type="button"
              onClick={() => setIncluyeHotel((v) => !v)}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <Check checked={incluyeHotel} />
              <span className="text-[13px] font-semibold text-ink">¿Incluye hotel?</span>
            </button>
            {incluyeHotel && (
              <>
                <select
                  value={form.hotelId}
                  onChange={(e) => setField("hotelId", e.target.value)}
                  className="mt-2.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                >
                  <option value="">Seleccionar hotel…</option>
                  {hoteles.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre}
                    </option>
                  ))}
                </select>
                <div className="mt-3">
                  <div className="mb-1.5 text-xs text-ink-soft">
                    Tipos de habitación disponibles para esta salida
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HABITACIONES.map((hab) => {
                      const checked = selectedHab.includes(hab.value);
                      return (
                        <button
                          key={hab.value}
                          type="button"
                          onClick={() => toggleHab(hab.value)}
                          style={checked ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#D6DAE0", color: "#6B7280" }}
                          className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"
                        >
                          {checked ? (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] bg-white">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </span>
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-[4px] border-[1.5px] border-[#C7CBD1]" />
                          )}
                          {hab.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[11.5px] text-ink-faint">
                    Al vender los asientos, quien reserve elige cuál de estos tipos usa cada grupo —
                    queda impreso en su voucher.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Asistencia */}
          <div className="rounded-[10px] border border-line p-3.5">
            <button
              type="button"
              onClick={() => setIncluyeAsistencia((v) => !v)}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <Check checked={incluyeAsistencia} />
              <span className="text-[13px] font-semibold text-ink">¿Incluye asistencia al viajero?</span>
            </button>
            {incluyeAsistencia && (
              <select
                value={form.asistenciaId}
                onChange={(e) => setField("asistenciaId", e.target.value)}
                className="mt-2.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
              >
                <option value="">Seleccionar asistencia…</option>
                {asistencias.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Observaciones */}
          <div className="rounded-[10px] border border-line p-3.5">
            <div className="mb-2.5 text-[13px] font-semibold text-ink">
              Observaciones a incluir en el voucher
            </div>
            <div className="flex flex-col gap-2">
              {observaciones.map((obs) => {
                const checked = selectedObs.includes(obs.id);
                return (
                  <button
                    key={obs.id}
                    type="button"
                    onClick={() => toggleObs(obs.id)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <Check checked={checked} />
                    <span className="text-[13px] text-ink">{obs.titulo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11.5px] text-ink-faint">
            Los hoteles, asistencias y observaciones se cargan una vez en{" "}
            <strong>Proveedores</strong> y quedan disponibles para elegir en cualquier servicio.
          </div>
        </div>

        {saved ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#BBF0CE] bg-[#DCFCE7] px-4 py-3.5">
            <div className="text-[13px] font-bold text-[#15803D]">
              ✓ Servicio creado — ya está disponible en el listado de Salidas.
            </div>
            <button
              type="button"
              onClick={reset}
              className="whitespace-nowrap rounded-lg border border-[#BBF0CE] bg-white px-3.5 py-2 text-xs font-bold text-[#15803D]"
            >
              Cargar otro
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={reset}
              className="rounded-[10px] border border-line px-[18px] py-2.5 text-[13px] font-semibold text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              style={{ background: ACCENT }}
              className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
            >
              Guardar servicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
