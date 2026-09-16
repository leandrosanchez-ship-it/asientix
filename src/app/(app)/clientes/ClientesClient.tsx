"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { actualizarCliente, type ClienteEditable } from "./actions";
import { ACCENT } from "@/lib/theme";
import { Toast } from "@/components/Toast";

export interface ClienteConViajes extends ClienteEditable {
  viajes: number;
  ultimoViaje: string | null; // ISO date, o null si nunca viajó
}

const PARENTESCOS = ["Padre/Madre", "Hermano/a", "Cónyuge", "Hijo/a", "Amigo/a", "Otro"];

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
      />
    </div>
  );
}

function EditarClienteModal({ cliente, onClose, onSaved }: { cliente: ClienteEditable; onClose: () => void; onSaved: (c: ClienteEditable) => void }) {
  const [form, setForm] = useState<ClienteEditable>(cliente);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof ClienteEditable>(field: K, value: ClienteEditable[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function guardar() {
    if (!form.nombre.trim() || !form.apellido.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await actualizarCliente(form);
        onSaved(form);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-0 py-12">
      <div className="max-h-full w-[520px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-[17px] font-extrabold text-ink">Editar cliente</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft">
            ✕
          </button>
        </div>

        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
          Datos básicos
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" value={form.nombre} onChange={(v) => setField("nombre", v)} />
          <Field label="Apellido" value={form.apellido} onChange={(v) => setField("apellido", v)} />
          <Field label="DNI" value={form.dni} onChange={(v) => setField("dni", v)} />
          <Field label="Fecha de nacimiento" value={form.nacimiento ?? ""} onChange={(v) => setField("nacimiento", v)} type="date" />
          <Field label="Teléfono" value={form.telefono} onChange={(v) => setField("telefono", v)} />
          <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} />
          <div className="col-span-2">
            <Field label="Localidad" value={form.localidad} onChange={(v) => setField("localidad", v)} />
          </div>
        </div>

        <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
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

        <div className="mb-2.5 mt-[18px] text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
          Obra social (opcional)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Obra social" value={form.obraSocial} onChange={(v) => setField("obraSocial", v)} />
          <Field label="Número de afiliado" value={form.obraSocialNro} onChange={(v) => setField("obraSocialNro", v)} />
        </div>

        {error && <div className="mt-3.5 text-xs font-semibold text-red-600">{error}</div>}

        <div className="mt-[22px] flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-line px-[18px] py-2.5 text-[13px] font-semibold text-ink">
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!form.nombre.trim() || !form.apellido.trim() || isPending}
            style={{ background: ACCENT }}
            className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientesClient({ clientes }: { clientes: ClienteConViajes[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editando, setEditando] = useState<ClienteConViajes | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const nombreCompleto = `${c.apellido} ${c.nombre}`.toLowerCase();
      return nombreCompleto.includes(q) || c.dni.toLowerCase().includes(q);
    });
  }, [clientes, query]);

  return (
    <div>
      <div className="px-8 pt-8">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Base de datos de clientes</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Buscá un pasajero ya cargado y reutilizá sus datos en una nueva reserva, sin volver a tipearlos.
        </p>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="px-8 pt-5">
        <div className="relative w-[380px] max-w-full">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o DNI…"
            className="w-full rounded-[10px] border border-line bg-white py-2.5 pl-[38px] pr-3.5 text-[13px] outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="px-8 py-5">
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr_1.1fr_0.7fr_1.6fr] gap-2 border-b border-line bg-app px-5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Nombre</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">DNI</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Teléfono</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Último viaje</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Viajes</div>
            <div />
          </div>

          {filtrados.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[2fr_1fr_1fr_1.1fr_0.7fr_1.6fr] items-center gap-2 border-b border-[#EEF0F2] px-5 py-3.5"
            >
              <div className="text-[13px] font-semibold text-ink">
                {c.apellido}, {c.nombre}
              </div>
              <div className="text-[13px] text-[#4B5563]">{c.dni || "—"}</div>
              <div className="text-[13px] text-[#4B5563]">{c.telefono || "—"}</div>
              <div className="text-[13px] text-[#4B5563]">{formatFecha(c.ultimoViaje)}</div>
              <div className="text-[13px] text-[#4B5563]">{c.viajes}</div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditando(c)}
                  className="whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-soft"
                >
                  Editar
                </button>
                <Link
                  href="/salidas"
                  className="whitespace-nowrap rounded-lg border border-accent px-3 py-1.5 text-xs font-bold text-accent"
                >
                  Usar en nueva reserva
                </Link>
              </div>
            </div>
          ))}

          {filtrados.length === 0 && (
            <div className="px-5 py-11 text-center text-[13px] text-ink-faint">
              {clientes.length === 0
                ? "Todavía no hay clientes cargados — aparecen automáticamente al hacer la primera reserva."
                : "No se encontraron clientes con esos datos."}
            </div>
          )}
        </div>
      </div>

      {editando && (
        <EditarClienteModal
          cliente={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            setToast("✓ Cliente actualizado");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
