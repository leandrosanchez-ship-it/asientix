"use client";

import { useState } from "react";
import type { TipoHabitacion } from "@/lib/types";

export interface PasajeroForm {
  nombre: string;
  apellido: string;
  dni: string;
  nacimiento: string;
  telefono: string;
  email: string;
  localidad: string;
  emerNombre: string;
  emerTelefono: string;
  emerParentesco: string;
  obraSocial: string;
  obraSocialNro: string;
}

export function emptyPasajeroForm(): PasajeroForm {
  return {
    nombre: "",
    apellido: "",
    dni: "",
    nacimiento: "",
    telefono: "",
    email: "",
    localidad: "",
    emerNombre: "",
    emerTelefono: "",
    emerParentesco: "",
    obraSocial: "",
    obraSocialNro: "",
  };
}

const PARENTESCOS = ["Padre/Madre", "Hermano/a", "Cónyuge", "Hijo/a", "Amigo/a", "Otro"];
const HABITACIONES: { value: TipoHabitacion; label: string }[] = [
  { value: "single", label: "Habitación single" },
  { value: "doble", label: "Habitación doble" },
  { value: "triple", label: "Habitación triple" },
  { value: "cuadruple", label: "Habitación cuádruple" },
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  span2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <div className="mb-1 text-xs text-ink-soft">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
      />
    </div>
  );
}

export function ReservationWizard({
  cart,
  tiposHabitacionDisponibles,
  onCancel,
  onFinish,
}: {
  cart: number[];
  tiposHabitacionDisponibles: TipoHabitacion[];
  onCancel: () => void;
  onFinish: (forms: PasajeroForm[], responsableIdx: number, habitacion: TipoHabitacion | null) => void;
}) {
  const [index, setIndex] = useState(0);
  const [forms, setForms] = useState<PasajeroForm[]>(cart.map(() => emptyPasajeroForm()));
  const [responsableIdx, setResponsableIdx] = useState<number | null>(0);
  const [habitacion, setHabitacion] = useState<TipoHabitacion | "">("");

  const form = forms[index];
  const isLast = index === cart.length - 1;
  const canAdvance = !!(form.nombre && form.apellido);

  function setField(field: keyof PasajeroForm, value: string) {
    setForms((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function next() {
    if (!canAdvance) return;
    setIndex((i) => Math.min(cart.length - 1, i + 1));
  }

  function finish() {
    if (!canAdvance) return;
    onFinish(forms, responsableIdx ?? 0, habitacion || null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/45 px-0 py-12">
      <div className="max-h-full w-[480px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-1.5 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
              Pasajero {index + 1} de {cart.length}
            </div>
            <h2 className="mt-0.5 text-[17px] font-extrabold text-ink">
              Asiento {cart[index]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft"
          >
            ✕
          </button>
        </div>

        <div className="my-3.5 flex gap-1">
          {cart.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i === index ? "#2563EB" : i < index ? "#93C5FD" : "#E3E5EA" }}
            />
          ))}
        </div>

        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
          Datos básicos
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" value={form.nombre} onChange={(v) => setField("nombre", v)} placeholder="Nombre" />
          <Field label="Apellido" value={form.apellido} onChange={(v) => setField("apellido", v)} placeholder="Apellido" />
          <Field label="DNI" value={form.dni} onChange={(v) => setField("dni", v)} placeholder="30.123.456" />
          <Field label="Fecha de nacimiento" value={form.nacimiento} onChange={(v) => setField("nacimiento", v)} type="date" />
          <Field label="Teléfono" value={form.telefono} onChange={(v) => setField("telefono", v)} placeholder="351 555-0000" />
          <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} placeholder="nombre@mail.com" />
          <Field label="Localidad" value={form.localidad} onChange={(v) => setField("localidad", v)} placeholder="Villa Carlos Paz, Córdoba" span2 />
        </div>

        <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
          Contacto de emergencia
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre y apellido" value={form.emerNombre} onChange={(v) => setField("emerNombre", v)} placeholder="Nombre y apellido" />
          <Field label="Teléfono" value={form.emerTelefono} onChange={(v) => setField("emerTelefono", v)} placeholder="351 555-0000" />
          <div className="col-span-2">
            <div className="mb-1 text-xs text-ink-soft">Parentesco</div>
            <select
              value={form.emerParentesco}
              onChange={(e) => setField("emerParentesco", e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            >
              <option value="">Seleccionar…</option>
              {PARENTESCOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
          Obra social (opcional)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Obra social" value={form.obraSocial} onChange={(v) => setField("obraSocial", v)} placeholder="Ej. PAMI, OSDE…" />
          <Field label="Número de afiliado" value={form.obraSocialNro} onChange={(v) => setField("obraSocialNro", v)} placeholder="Número de afiliado" />
        </div>

        <div className="mt-[18px] rounded-[10px] border border-line p-3.5">
          <button
            type="button"
            onClick={() => setResponsableIdx((prev) => (prev === index ? null : index))}
            className="flex w-full items-center gap-2.5 text-left"
          >
            <span
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
              style={
                responsableIdx === index
                  ? { background: "#2563EB" }
                  : { border: "1.5px solid #C7CBD1" }
              }
            >
              {responsableIdx === index && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className="text-[13px] font-semibold text-ink">Es el responsable de la reserva</span>
          </button>
          <div className="ml-7 mt-1.5 text-[11.5px] text-ink-faint">
            Se emite un solo voucher a nombre del responsable, cubriendo los {cart.length} asientos.
          </div>
        </div>

        {tiposHabitacionDisponibles.length > 0 && (
          <div className="mt-3 rounded-[10px] border border-line p-3.5">
            <div className="mb-2 text-[13px] font-semibold text-ink">
              Hotel incluido — tipo de habitación (opcional)
            </div>
            <select
              value={habitacion}
              onChange={(e) => setHabitacion(e.target.value as TipoHabitacion | "")}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            >
              <option value="">Sin hotel / no aplica</option>
              {HABITACIONES.filter((h) => tiposHabitacionDisponibles.includes(h.value)).map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            <div className="mt-1.5 text-[11.5px] text-ink-faint">
              Se comparte entre todos los asientos de esta reserva y figura en el voucher.
            </div>
          </div>
        )}

        <div className="mt-[26px] flex justify-between gap-2.5">
          {index > 0 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="rounded-[10px] border border-line px-[18px] py-2.5 text-[13px] font-semibold text-ink"
            >
              Atrás
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={isLast ? finish : next}
            disabled={!canAdvance}
            className="rounded-[10px] bg-[#2563EB] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
          >
            {isLast ? "Finalizar reserva" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
