"use client";

import { useState } from "react";
import { buscarClientePorDni, type ClienteEditable } from "../../clientes/actions";
import { emptyPasajeroForm, type PasajeroForm } from "./ReservationWizard";

const PARENTESCOS = ["Padre/Madre", "Hermano/a", "Cónyuge", "Hijo/a", "Amigo/a", "Otro"];

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
        className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
      />
    </div>
  );
}

export function ReemplazarPasajeroModal({
  numero,
  accent,
  isPending,
  onCancel,
  onConfirmar,
}: {
  numero: number;
  accent: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirmar: (form: PasajeroForm) => void;
}) {
  const [form, setForm] = useState<PasajeroForm>(emptyPasajeroForm());
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniEncontrado, setDniEncontrado] = useState<string | null>(null);

  function setField(field: keyof PasajeroForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function aplicarClienteEncontrado(c: ClienteEditable) {
    setForm((prev) => ({
      ...prev,
      nombre: c.nombre,
      apellido: c.apellido,
      dni: c.dni,
      nacimiento: c.nacimiento ?? "",
      telefono: c.telefono,
      email: c.email,
      localidad: c.localidad,
      emerNombre: c.emerNombre,
      emerTelefono: c.emerTelefono,
      emerParentesco: c.emerParentesco,
      obraSocial: c.obraSocial,
      obraSocialNro: c.obraSocialNro,
      clienteIdExistente: c.id,
    }));
  }

  function buscarPorDni() {
    if (!form.dni.trim()) return;
    setBuscandoDni(true);
    setDniEncontrado(null);
    buscarClientePorDni(form.dni)
      .then((c) => {
        if (c) {
          aplicarClienteEncontrado(c);
          setDniEncontrado(`${c.apellido}, ${c.nombre}`);
        } else {
          setDniEncontrado("");
        }
      })
      .finally(() => setBuscandoDni(false));
  }

  const puedeConfirmar = !!(form.nombre.trim() && form.apellido.trim());

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 px-0 py-12">
      <div className="max-h-full w-[480px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-[18px] flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
              Asiento {numero}
            </div>
            <h2 className="mt-0.5 text-[17px] font-extrabold text-ink">Reemplazar pasajero</h2>
          </div>
          <button type="button" onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft">
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-[10px] border border-[#FBE0A0] bg-[#FEF3C7] px-3.5 py-3 text-[12.5px] text-[#92400E]">
          Carga los datos de la persona nueva — el asiento, el precio y el historial de pagos quedan igual, solo
          cambia quién viaja.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" value={form.nombre} onChange={(v) => setField("nombre", v)} placeholder="Nombre" />
          <Field label="Apellido" value={form.apellido} onChange={(v) => setField("apellido", v)} placeholder="Apellido" />
          <div>
            <div className="mb-1 text-xs text-ink-soft">DNI</div>
            <div className="flex gap-1.5">
              <input
                value={form.dni}
                onChange={(e) => {
                  setField("dni", e.target.value);
                  setDniEncontrado(null);
                }}
                placeholder="30.123.456"
                className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={buscarPorDni}
                disabled={!form.dni.trim() || buscandoDni}
                className="whitespace-nowrap rounded-lg border border-line px-2.5 text-xs font-bold text-ink-soft disabled:opacity-55"
              >
                {buscandoDni ? "…" : "Buscar"}
              </button>
            </div>
            {dniEncontrado === "" && <div className="mt-1 text-[11px] text-ink-faint">No hay ningún cliente con ese DNI todavía.</div>}
            {dniEncontrado && <div className="mt-1 text-[11px] font-semibold text-[#15803D]">✓ Se completó con los datos de {dniEncontrado}</div>}
          </div>
          <Field label="Fecha de nacimiento" value={form.nacimiento} onChange={(v) => setField("nacimiento", v)} type="date" />
          <Field label="Teléfono" value={form.telefono} onChange={(v) => setField("telefono", v)} placeholder="351 555-0000" />
          <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} placeholder="nombre@mail.com" />
          <Field label="Localidad" value={form.localidad} onChange={(v) => setField("localidad", v)} placeholder="Villa Carlos Paz, Córdoba" />
          <Field label="Embarque" value={form.embarque} onChange={(v) => setField("embarque", v)} placeholder="Ej. Cosquín" />
        </div>

        <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          Contacto de emergencia
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre y apellido" value={form.emerNombre} onChange={(v) => setField("emerNombre", v)} />
          <Field label="Teléfono" value={form.emerTelefono} onChange={(v) => setField("emerTelefono", v)} />
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

        <div className="mt-[26px] flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="rounded-[10px] border border-line px-[18px] py-2.5 text-[13px] font-semibold text-ink">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(form)}
            disabled={!puedeConfirmar || isPending}
            style={{ background: accent }}
            className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
          >
            {isPending ? "Guardando…" : "Confirmar reemplazo"}
          </button>
        </div>
      </div>
    </div>
  );
}
