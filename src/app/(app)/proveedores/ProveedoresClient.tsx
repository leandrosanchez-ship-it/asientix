"use client";

import { useState } from "react";
import type { AsistenciaViajero, Hotel, Observacion } from "@/lib/types";
import { AGENCIA_SEQUEIRA } from "@/lib/mock-data";

type Tab = "hoteles" | "asistencias" | "observaciones";

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const ACCENT = "#2E6E8E";

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { background: ACCENT, color: "#fff", borderColor: ACCENT } : { color: "#6B7280" }}
      className={`rounded-full border px-4 py-2 text-xs font-bold ${active ? "" : "border-line bg-white"}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-ink-soft">{label}</div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
        />
      )}
    </div>
  );
}

export function ProveedoresClient({
  hotelesIniciales,
  asistenciasIniciales,
  observacionesIniciales,
}: {
  hotelesIniciales: Hotel[];
  asistenciasIniciales: AsistenciaViajero[];
  observacionesIniciales: Observacion[];
}) {
  const [tab, setTab] = useState<Tab>("hoteles");
  const [hoteles, setHoteles] = useState(hotelesIniciales);
  const [asistencias, setAsistencias] = useState(asistenciasIniciales);
  const [observaciones, setObservaciones] = useState(observacionesIniciales);

  const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "" });
  const [obsForm, setObsForm] = useState({ titulo: "", texto: "" });

  const isHoteles = tab === "hoteles";
  const isObservaciones = tab === "observaciones";
  const items = isHoteles ? hoteles : asistencias;

  function changeTab(t: Tab) {
    setTab(t);
    setForm({ nombre: "", contacto: "", telefono: "" });
  }

  function addProveedor() {
    if (!form.nombre) return;
    const nuevo = { id: nextId(tab), agenciaId: AGENCIA_SEQUEIRA.id, ...form };
    if (isHoteles) setHoteles((prev) => [...prev, nuevo]);
    else setAsistencias((prev) => [...prev, nuevo]);
    setForm({ nombre: "", contacto: "", telefono: "" });
  }

  function addObservacion() {
    if (!obsForm.titulo || !obsForm.texto) return;
    setObservaciones((prev) => [
      ...prev,
      { id: nextId("obs"), agenciaId: AGENCIA_SEQUEIRA.id, ...obsForm },
    ]);
    setObsForm({ titulo: "", texto: "" });
  }

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-[22px] font-extrabold text-ink">Proveedores</h1>
      <p className="mt-1 text-[13px] text-ink-soft">
        Cargá una vez tus hoteles, empresas de asistencia al viajero y observaciones —
        después quedan disponibles para elegir al dar de alta cualquier servicio.
      </p>

      <div className="mt-[18px] flex gap-2.5">
        <Pill active={tab === "hoteles"} onClick={() => changeTab("hoteles")}>
          Hoteles
        </Pill>
        <Pill active={tab === "asistencias"} onClick={() => changeTab("asistencias")}>
          Asistencia al viajero
        </Pill>
        <Pill active={tab === "observaciones"} onClick={() => changeTab("observaciones")}>
          Observaciones
        </Pill>
      </div>

      {isObservaciones ? (
        <div className="mt-5 flex items-start gap-5">
          <div className="w-80 shrink-0 rounded-2xl border border-line bg-white p-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              Nueva observación
            </div>
            <div className="flex flex-col gap-2.5">
              <Field label="Título" value={obsForm.titulo} onChange={(v) => setObsForm((p) => ({ ...p, titulo: v }))} placeholder="Ej. Equipaje" />
              <Field
                label="Texto"
                value={obsForm.texto}
                onChange={(v) => setObsForm((p) => ({ ...p, texto: v }))}
                placeholder="Texto que va a figurar en el voucher"
                textarea
              />
              <button
                type="button"
                onClick={addObservacion}
                disabled={!obsForm.titulo || !obsForm.texto}
                style={{ background: ACCENT }}
                className="mt-1 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                Agregar observación
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line bg-app px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Observaciones cargadas
            </div>
            {observaciones.map((obs) => (
              <div key={obs.id} className="border-b border-[#EEF0F2] px-5 py-3.5">
                <div className="text-[13px] font-bold text-ink">{obs.titulo}</div>
                <div className="mt-0.5 text-[13px] text-[#4B5563]">{obs.texto}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-5">
          <div className="w-80 shrink-0 rounded-2xl border border-line bg-white p-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              {isHoteles ? "Nuevo hotel" : "Nueva asistencia"}
            </div>
            <div className="flex flex-col gap-2.5">
              <Field
                label="Nombre"
                value={form.nombre}
                onChange={(v) => setForm((p) => ({ ...p, nombre: v }))}
                placeholder={isHoteles ? "Ej. Hotel Portal del Lago" : "Ej. Assist Card"}
              />
              <Field label="Contacto" value={form.contacto} onChange={(v) => setForm((p) => ({ ...p, contacto: v }))} placeholder="Nombre de la persona de contacto" />
              <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm((p) => ({ ...p, telefono: v }))} placeholder="351 555-0000" />
              <button
                type="button"
                onClick={addProveedor}
                disabled={!form.nombre}
                style={{ background: ACCENT }}
                className="mt-1 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                {isHoteles ? "Agregar hotel" : "Agregar asistencia"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="grid grid-cols-[1.6fr_1.3fr_1.1fr] border-b border-line bg-app px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              <div>Nombre</div>
              <div>Contacto</div>
              <div>Teléfono</div>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1.6fr_1.3fr_1.1fr] items-center border-b border-[#EEF0F2] px-5 py-3.5">
                <div className="text-[13px] font-semibold text-ink">{item.nombre}</div>
                <div className="text-[13px] text-[#4B5563]">{item.contacto}</div>
                <div className="text-[13px] text-[#4B5563]">{item.telefono}</div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="px-5 py-11 text-center text-[13px] text-ink-faint">
                {isHoteles ? "Todavía no cargás ningún hotel." : "Todavía no cargás ninguna asistencia."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
