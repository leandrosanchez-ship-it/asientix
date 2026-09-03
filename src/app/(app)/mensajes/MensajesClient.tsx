"use client";

import { useMemo, useState, useTransition } from "react";
import { guardarPlantilla } from "./actions";

const ACCENT = "#2E6E8E";

export interface Plantillas {
  saldo: string;
  viaje: string;
  cumple: string;
  promo: string;
}

export interface Recipient {
  display: string;
  telefono: string;
  extra: string | null;
  data: Record<string, string | number>;
}

export interface ClienteConEdad {
  display: string;
  telefono: string;
  edad: number | null;
  data: Record<string, string | number>;
}

type Tab = "saldo" | "viaje" | "cumple" | "promo";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "saldo", label: "Saldo pendiente" },
  { tab: "viaje", label: "Recordatorio de viaje" },
  { tab: "cumple", label: "Cumpleaños" },
  { tab: "promo", label: "Promociones" },
];

const LIST_TITLES: Record<Tab, string> = {
  saldo: "Pasajeros con saldo pendiente",
  viaje: "Pasajeros del viaje de mañana",
  cumple: "Clientes — cumpleaños",
  promo: "Clientes — promociones",
};

const TOKEN_HINTS: Record<Tab, string> = {
  saldo: "{nombre}, {saldo}, {destino}, {fecha}",
  viaje: "{nombre}, {fecha}, {hora}, {lugar}, {asiento}",
  cumple: "{nombre}",
  promo: "{nombre}",
};

function fillTemplate(tpl: string, data: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (data[k] !== undefined && data[k] !== null ? String(data[k]) : m));
}

function waLink(telefono: string, mensaje: string) {
  const digits = telefono.replace(/\D/g, "");
  return `https://wa.me/549${digits}?text=${encodeURIComponent(mensaje)}`;
}

export function MensajesClient({
  plantillas,
  saldoRecipients,
  viajeRecipients,
  clientesConEdad,
}: {
  plantillas: Plantillas;
  saldoRecipients: Recipient[];
  viajeRecipients: Recipient[];
  clientesConEdad: ClienteConEdad[];
}) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("saldo");
  const [textos, setTextos] = useState<Plantillas>(plantillas);
  const [guardados, setGuardados] = useState<Plantillas>(plantillas);
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEdadTab = tab === "cumple" || tab === "promo";
  const dirty = textos[tab] !== guardados[tab];

  const recipients: Recipient[] = useMemo(() => {
    if (tab === "saldo") return saldoRecipients;
    if (tab === "viaje") return viajeRecipients;

    const min = parseInt(edadMin, 10);
    const max = parseInt(edadMax, 10);
    return clientesConEdad
      .filter((c) => {
        if (!isNaN(min) && (c.edad === null || c.edad < min)) return false;
        if (!isNaN(max) && (c.edad === null || c.edad > max)) return false;
        return true;
      })
      .map((c) => ({
        display: c.display,
        telefono: c.telefono,
        extra: c.edad !== null ? `${c.edad} años` : "edad no cargada",
        data: c.data,
      }));
  }, [tab, edadMin, edadMax, saldoRecipients, viajeRecipients, clientesConEdad]);

  function guardar() {
    setSaveError(null);
    startTransition(async () => {
      try {
        await guardarPlantilla({ tipo: tab, texto: textos[tab] });
        setGuardados((prev) => ({ ...prev, [tab]: textos[tab] }));
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function copiarLista() {
    const lineas = recipients.map((r) => `${r.display} — ${r.telefono}`).join("\n");
    navigator.clipboard?.writeText(lineas).catch(() => {});
    setCopyToast(`✓ Se copió la lista (${recipients.length} contactos)`);
  }

  return (
    <div>
      <div className="px-8 pt-7">
        <h1 className="font-display text-[22px] font-extrabold text-ink">Mensajes</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Redactá el mensaje una vez y abrí WhatsApp para cada pasajero — el envío siempre lo hacés vos, a mano, uno
          por uno.
        </p>
      </div>

      <div className="flex gap-2.5 px-8 pt-[18px]">
        {TABS.map((t) => {
          const active = tab === t.tab;
          return (
            <button
              key={t.tab}
              onClick={() => {
                setTab(t.tab);
                setCopyToast(null);
                setSaveError(null);
              }}
              style={active ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E3E5EA", color: "#6B7280" }}
              className="rounded-full border bg-white px-4 py-2.5 text-xs font-bold"
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {isEdadTab && (
        <div className="flex flex-wrap items-end gap-3.5 px-8 pt-3.5">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Edad mínima</div>
            <input
              value={edadMin}
              onChange={(e) => {
                setEdadMin(e.target.value);
                setCopyToast(null);
              }}
              placeholder="Ej. 20"
              className="w-[100px] rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Edad máxima</div>
            <input
              value={edadMax}
              onChange={(e) => {
                setEdadMax(e.target.value);
                setCopyToast(null);
              }}
              placeholder="Ej. 40"
              className="w-[100px] rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={copiarLista}
            style={{ borderColor: ACCENT, color: ACCENT }}
            className="whitespace-nowrap rounded-lg border bg-white px-4 py-2 text-xs font-bold"
          >
            Copiar lista filtrada
          </button>
          <div className="text-xs text-ink-faint">
            {recipients.length} de {clientesConEdad.length} clientes
          </div>
        </div>
      )}
      {copyToast && (
        <div className="mx-8 mt-3 inline-block rounded-lg border border-[#BBF0CE] bg-[#DCFCE7] px-3.5 py-2 text-xs font-bold text-[#15803D]">
          {copyToast}
        </div>
      )}

      <div className="flex flex-col gap-4 px-8 py-[18px]">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
            Texto del mensaje
          </div>
          <textarea
            value={textos[tab]}
            onChange={(e) => setTextos((prev) => ({ ...prev, [tab]: e.target.value }))}
            rows={3}
            className="w-full resize-y rounded-lg border border-line p-3 text-[13px] leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[11px] text-ink-faint">Podés usar {TOKEN_HINTS[tab]} y se completan solos con los datos de cada pasajero.</div>
            {dirty && (
              <button
                onClick={guardar}
                disabled={isPending}
                style={{ background: ACCENT }}
                className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-55"
              >
                {isPending ? "Guardando…" : "Guardar plantilla"}
              </button>
            )}
          </div>
          {saveError && <div className="mt-2 text-xs font-semibold text-red-600">{saveError}</div>}
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{LIST_TITLES[tab]}</div>
          </div>

          {recipients.map((r, i) => {
            const mensaje = fillTemplate(textos[tab], r.data);
            return (
              <div key={i} className="flex items-center gap-4 border-b border-[#EEF0F2] px-5 py-4">
                <div className="w-[180px] shrink-0">
                  <div className="text-[13px] font-bold text-ink">{r.display}</div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {r.telefono}
                    {r.extra ? ` · ${r.extra}` : ""}
                  </div>
                </div>
                <div className="flex-1 whitespace-pre-wrap rounded-lg border border-[#EEF0F2] bg-[#F9FAFB] px-3 py-2.5 text-xs leading-relaxed text-[#4B5563]">
                  {mensaje}
                </div>
                <a
                  href={waLink(r.telefono, mensaje)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-xs font-bold text-white"
                  style={{ background: "#25D366" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Abrir WhatsApp
                </a>
              </div>
            );
          })}

          {recipients.length === 0 && (
            <div className="px-5 py-11 text-center text-[13px] text-ink-faint">
              {tab === "saldo" && "No hay pasajeros con saldo pendiente."}
              {tab === "viaje" && "No hay salidas programadas para mañana."}
              {isEdadTab && "No hay clientes que coincidan con este filtro."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
