"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AsistenciaViajero, Coordinador, Hotel, Observacion, Transporte } from "@/lib/types";
import { crearHotel, crearAsistencia, crearObservacion, crearCoordinador, crearTransporte } from "./actions";
import { ACCENT } from "@/lib/theme";

type Tab = "hoteles" | "asistencias" | "coordinadores" | "transportes" | "observaciones";

interface CampoDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select" | "number";
  options?: { value: string; label: string }[];
}

const CAMPOS: Record<Exclude<Tab, "observaciones">, CampoDef[]> = {
  hoteles: [
    { key: "nombre", label: "Nombre", placeholder: "Ej. Hotel Portal del Lago" },
    { key: "contacto", label: "Contacto", placeholder: "Nombre de la persona de contacto" },
    { key: "telefono", label: "Teléfono", placeholder: "351 555-0000" },
    { key: "direccion", label: "Dirección", placeholder: "Se muestra en el voucher" },
  ],
  asistencias: [
    { key: "nombre", label: "Nombre", placeholder: "Ej. Assist Card" },
    { key: "contacto", label: "Contacto", placeholder: "Nombre de la persona de contacto" },
    { key: "telefono", label: "Teléfono", placeholder: "351 555-0000" },
    {
      key: "topeCoberturaMoneda",
      label: "Tope de cobertura — moneda",
      type: "select",
      options: [
        { value: "", label: "Sin definir" },
        { value: "ARS", label: "Pesos (ARS)" },
        { value: "USD", label: "Dólares (USD)" },
      ],
    },
    { key: "topeCoberturaMonto", label: "Tope de cobertura — importe", type: "number", placeholder: "30000" },
  ],
  coordinadores: [
    { key: "nombre", label: "Nombre", placeholder: "Ej. Marcela" },
    { key: "apellido", label: "Apellido", placeholder: "Ej. Sequeira" },
    { key: "telefono", label: "Teléfono", placeholder: "351 555-0000" },
  ],
  transportes: [
    { key: "nombre", label: "Nombre", placeholder: "Ej. Transportes del Valle" },
    { key: "contacto", label: "Contacto", placeholder: "Teléfono, email o persona de contacto" },
  ],
};

const TAB_LABEL: Record<Tab, { singular: string; plural: string }> = {
  hoteles: { singular: "hotel", plural: "Hoteles" },
  asistencias: { singular: "asistencia", plural: "Asistencia al viajero" },
  coordinadores: { singular: "coordinador", plural: "Coordinadores" },
  transportes: { singular: "transporte", plural: "Transporte" },
  observaciones: { singular: "observación", plural: "Observaciones" },
};

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { background: ACCENT, color: "#fff", borderColor: ACCENT } : { color: "#6B7280" }}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold ${active ? "" : "border-line bg-white"}`}
    >
      {children}
    </button>
  );
}

function Field({ def, value, onChange }: { def: CampoDef; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-xs text-ink-soft">{def.label}</div>
      {def.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={3}
          className="w-full resize-y rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
        />
      ) : def.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
        >
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={def.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
        />
      )}
    </div>
  );
}

function emptyForm(tab: Exclude<Tab, "observaciones">): Record<string, string> {
  const f: Record<string, string> = {};
  CAMPOS[tab].forEach((c) => (f[c.key] = ""));
  return f;
}

export function ProveedoresClient({
  hotelesIniciales,
  asistenciasIniciales,
  coordinadoresIniciales,
  transportesIniciales,
  observacionesIniciales,
}: {
  hotelesIniciales: Hotel[];
  asistenciasIniciales: AsistenciaViajero[];
  coordinadoresIniciales: Coordinador[];
  transportesIniciales: Transporte[];
  observacionesIniciales: Observacion[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState<Tab>("hoteles");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm("hoteles"));
  const [obsForm, setObsForm] = useState({ titulo: "", texto: "" });

  const isObservaciones = tab === "observaciones";

  const listaPorTab: Record<Tab, { nombre: string; sub: string }[]> = {
    hoteles: hotelesIniciales.map((h) => ({ nombre: h.nombre, sub: [h.contacto, h.telefono, h.direccion].filter(Boolean).join(" · ") })),
    asistencias: asistenciasIniciales.map((a) => ({
      nombre: a.nombre,
      sub: [a.contacto, a.telefono, a.topeCoberturaMonto ? `Tope ${a.topeCoberturaMoneda} ${a.topeCoberturaMonto.toLocaleString("es-AR")}` : null]
        .filter(Boolean)
        .join(" · "),
    })),
    coordinadores: coordinadoresIniciales.map((c) => ({ nombre: `${c.apellido}, ${c.nombre}`, sub: c.telefono })),
    transportes: transportesIniciales.map((t) => ({ nombre: t.nombre, sub: t.contacto })),
    observaciones: [],
  };

  function changeTab(t: Tab) {
    setTab(t);
    if (t !== "observaciones") setForm(emptyForm(t));
    setError(null);
  }

  function addProveedor() {
    if (tab === "observaciones") return;
    const campos = CAMPOS[tab];
    const requerido = campos[0].key; // nombre siempre es el primer campo y es obligatorio
    if (!form[requerido]?.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        if (tab === "hoteles") await crearHotel({ nombre: form.nombre, contacto: form.contacto, telefono: form.telefono, direccion: form.direccion });
        else if (tab === "asistencias")
          await crearAsistencia({
            nombre: form.nombre,
            contacto: form.contacto,
            telefono: form.telefono,
            topeCoberturaMoneda: form.topeCoberturaMoneda || null,
            topeCoberturaMonto: form.topeCoberturaMonto ? Number(form.topeCoberturaMonto) : null,
          });
        else if (tab === "coordinadores") await crearCoordinador({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono });
        else if (tab === "transportes") await crearTransporte({ nombre: form.nombre, contacto: form.contacto });
        setForm(emptyForm(tab));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function addObservacion() {
    if (!obsForm.titulo || !obsForm.texto) return;
    setError(null);
    startTransition(async () => {
      try {
        await crearObservacion(obsForm);
        setObsForm({ titulo: "", texto: "" });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-[22px] font-extrabold text-ink">Proveedores</h1>
      <p className="mt-1 text-[13px] text-ink-soft">
        Cargá una vez tus hoteles, empresas de asistencia al viajero, coordinadores, transporte y
        observaciones — después quedan disponibles para elegir al dar de alta cualquier servicio.
      </p>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <Pill key={t} active={tab === t} onClick={() => changeTab(t)}>
            {TAB_LABEL[t].plural}
          </Pill>
        ))}
      </div>

      {isObservaciones ? (
        <div className="mt-5 flex items-start gap-5">
          <div className="w-80 shrink-0 rounded-2xl border border-line bg-white p-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              Nueva observación
            </div>
            <div className="flex flex-col gap-2.5">
              <Field def={{ key: "titulo", label: "Título", placeholder: "Ej. Equipaje" }} value={obsForm.titulo} onChange={(v) => setObsForm((p) => ({ ...p, titulo: v }))} />
              <Field
                def={{ key: "texto", label: "Texto", placeholder: "Texto que va a figurar en el voucher", type: "textarea" }}
                value={obsForm.texto}
                onChange={(v) => setObsForm((p) => ({ ...p, texto: v }))}
              />
              {error && <div className="text-xs font-semibold text-red-600">{error}</div>}
              <button
                type="button"
                onClick={addObservacion}
                disabled={!obsForm.titulo || !obsForm.texto || isPending}
                style={{ background: ACCENT }}
                className="mt-1 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                {isPending ? "Agregando…" : "Agregar observación"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line bg-app px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Observaciones cargadas
            </div>
            {observacionesIniciales.map((obs) => (
              <div key={obs.id} className="border-b border-[#EEF0F2] px-5 py-3.5">
                <div className="text-[13px] font-bold text-ink">{obs.titulo}</div>
                <div className="mt-0.5 text-[13px] text-[#4B5563]">{obs.texto}</div>
              </div>
            ))}
            {observacionesIniciales.length === 0 && (
              <div className="px-5 py-11 text-center text-[13px] text-ink-faint">Todavía no cargás ninguna observación.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-5">
          <div className="w-80 shrink-0 rounded-2xl border border-line bg-white p-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              Nuevo {TAB_LABEL[tab].singular}
            </div>
            <div className="flex flex-col gap-2.5">
              {CAMPOS[tab].map((def) => (
                <Field key={def.key} def={def} value={form[def.key] ?? ""} onChange={(v) => setForm((p) => ({ ...p, [def.key]: v }))} />
              ))}
              {error && <div className="text-xs font-semibold text-red-600">{error}</div>}
              <button
                type="button"
                onClick={addProveedor}
                disabled={!form[CAMPOS[tab][0].key]?.trim() || isPending}
                style={{ background: ACCENT }}
                className="mt-1 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                {isPending ? "Agregando…" : `Agregar ${TAB_LABEL[tab].singular}`}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line bg-app px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              {TAB_LABEL[tab].plural} cargados
            </div>
            {listaPorTab[tab].map((item, i) => (
              <div key={i} className="border-b border-[#EEF0F2] px-5 py-3.5">
                <div className="text-[13px] font-semibold text-ink">{item.nombre}</div>
                {item.sub && <div className="mt-0.5 text-[13px] text-[#4B5563]">{item.sub}</div>}
              </div>
            ))}
            {listaPorTab[tab].length === 0 && (
              <div className="px-5 py-11 text-center text-[13px] text-ink-faint">Todavía no cargás ningún {TAB_LABEL[tab].singular}.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
