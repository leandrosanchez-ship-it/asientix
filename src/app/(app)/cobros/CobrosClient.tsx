"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarPago } from "./actions";
import { descargarBoletoPdf } from "@/lib/descargar-boleto";
import { Toast } from "@/components/Toast";
import { digitsWhatsapp } from "@/lib/format";
import type { MedioPago, Moneda } from "@/lib/types";
import { ACCENT } from "@/lib/theme";

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
];

export interface FilaCobro {
  id: string; // reserva id — una fila por reserva, no por pasajero
  reservaPasajeroId: string; // del responsable, para descargar el boleto
  pasajero: string; // "Apellido, Nombre" o "Apellido, Nombre +N" si es grupal
  cantidadPasajeros: number;
  nombre: string;
  telefono: string;
  servicio: string;
  asientos: number[];
  total: number;
  pagado: number;
  saldo: number;
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function waLink(nombre: string, telefono: string, saldo: number, servicio: string) {
  const mensaje = `Hola ${nombre}! Te escribimos de tu agencia para recordarte que tenés un saldo pendiente de ${fmt(saldo)} por tu pasaje (${servicio}). Cualquier consulta, quedamos a disposición. ¡Gracias!`;
  return `https://wa.me/${digitsWhatsapp(telefono)}?text=${encodeURIComponent(mensaje)}`;
}

export function CobrosClient({ filasIniciales }: { filasIniciales: FilaCobro[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filas, setFilas] = useState(filasIniciales);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [montoInputs, setMontoInputs] = useState<Record<string, string>>({});
  const [medioInputs, setMedioInputs] = useState<Record<string, MedioPago>>({});
  const [monedaInputs, setMonedaInputs] = useState<Record<string, Moneda>>({});
  const [pagadas, setPagadas] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) => f.pasajero.toLowerCase().includes(q));
  }, [filas, query]);

  const totalPendiente = filas.reduce((sum, f) => (pagadas[f.id] ? sum : sum + f.saldo), 0);

  function registrar(fila: FilaCobro) {
    const monto = parseFloat(montoInputs[fila.id] ?? "");
    if (!monto || monto <= 0) return;
    if (monto > fila.saldo + 0.5) {
      setError(`El monto no puede superar el saldo pendiente (${fmt(fila.saldo)}).`);
      return;
    }
    setError(null);
    const medioPago = medioInputs[fila.id] ?? "efectivo";
    const moneda = monedaInputs[fila.id] ?? "ARS";

    startTransition(async () => {
      try {
        await registrarPago({ reservaId: fila.id, monto, medioPago, moneda: medioPago === "efectivo" ? moneda : null });
        setFilas((prev) =>
          prev.map((f) => {
            if (f.id !== fila.id) return f;
            const nuevoPagado = f.pagado + monto;
            const nuevoSaldo = Math.max(f.total - nuevoPagado, 0);
            if (nuevoSaldo <= 0) setPagadas((p) => ({ ...p, [fila.id]: true }));
            return { ...f, pagado: nuevoPagado, saldo: nuevoSaldo };
          }),
        );
        setMontoInputs((prev) => ({ ...prev, [fila.id]: "" }));
        setExpandedId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  const [generandoBoletoId, setGenerandoBoletoId] = useState<string | null>(null);
  function descargarBoleto(fila: FilaCobro) {
    if (generandoBoletoId) return;
    setGenerandoBoletoId(fila.id);
    setToast("Generando boleto…");
    descargarBoletoPdf(fila.reservaPasajeroId)
      .then((filename) => setToast(`✓ Se descargó ${filename}`))
      .catch((e) => setToast(`✕ No se pudo generar el boleto: ${e instanceof Error ? e.message : "error"}`))
      .finally(() => setGenerandoBoletoId(null));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between px-8 pt-7">
        <div>
          <h1 className="font-display text-[22px] font-extrabold text-ink">Cobros pendientes</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            Reservas con saldo pendiente de pago — una reserva de varios asientos cuenta como una sola deuda.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-ink-faint">Total pendiente</div>
          <div className="text-[22px] font-extrabold text-[#B91C1C]">{fmt(totalPendiente)}</div>
        </div>
      </div>

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
            placeholder="Buscar por nombre…"
            className="w-full rounded-[10px] border border-line bg-white py-2.5 pl-[38px] pr-3.5 text-[13px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {error && (
        <div className="mx-8 mt-4 rounded-[10px] border border-[#F8C6C6] bg-[#FEE2E2] px-4 py-3 text-xs font-bold text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="px-8 py-5">
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="grid grid-cols-[1.6fr_2fr_0.7fr_1fr_1fr_1fr_1.6fr] gap-2 border-b border-line bg-app px-5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Pasajero</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Servicio</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Asientos</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Total</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Pagado</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Saldo</div>
            <div />
          </div>

          {filtradas.map((fila) => {
            const isPaid = !!pagadas[fila.id];
            const isExpanded = expandedId === fila.id && !isPaid;
            return (
              <div key={fila.id}>
                <div className="grid grid-cols-[1.6fr_2fr_0.7fr_1fr_1fr_1fr_1.6fr] items-center gap-2 border-b border-[#EEF0F2] px-5 py-3.5 text-[13px]">
                  <div className="font-semibold text-ink">{fila.pasajero}</div>
                  <div className="text-[#4B5563]">{fila.servicio}</div>
                  <div className="text-[#4B5563]">{fila.asientos.join(", ")}</div>
                  <div className="text-[#4B5563]">{fmt(fila.total)}</div>
                  <div className="text-[#4B5563]">{fmt(fila.pagado)}</div>
                  <div className="font-bold" style={{ color: isPaid ? "#15803D" : "#B91C1C" }}>
                    {fmt(fila.saldo)}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {!isPaid && fila.telefono && (
                      <a
                        href={waLink(fila.nombre, fila.telefono, fila.saldo, fila.servicio)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ background: "#25D366" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </a>
                    )}
                    {isPaid ? (
                      <>
                        <span className="rounded-full bg-[#DCFCE7] px-3 py-1.5 text-[11px] font-bold text-[#15803D]">Pagado</span>
                        <button
                          onClick={() => descargarBoleto(fila)}
                          disabled={generandoBoletoId === fila.id}
                          style={{ opacity: generandoBoletoId === fila.id ? 0.6 : 1 }}
                          className="whitespace-nowrap rounded-lg border border-[#15803D] bg-white px-3 py-1.5 text-[11px] font-bold text-[#15803D] disabled:cursor-not-allowed"
                        >
                          {generandoBoletoId === fila.id ? "Generando…" : "Boleto"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setExpandedId((id) => (id === fila.id ? null : fila.id))}
                        style={{ borderColor: ACCENT, color: ACCENT }}
                        className="whitespace-nowrap rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"
                      >
                        Registrar pago
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="flex flex-col gap-2 border-b border-[#EEF0F2] bg-[#FBFBFA] px-5 py-3.5">
                  {fila.cantidadPasajeros > 1 && (
                    <div className="text-[11.5px] text-ink-faint">
                      Reserva de {fila.cantidadPasajeros} pasajeros — el monto se reparte proporcional a lo que le
                      falta a cada uno.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={montoInputs[fila.id] ?? ""}
                      onChange={(e) => setMontoInputs((prev) => ({ ...prev, [fila.id]: e.target.value }))}
                      placeholder={`Monto a registrar (máx. ${fmt(fila.saldo)})`}
                      className="w-[220px] rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-accent"
                    />
                    <select
                      value={medioInputs[fila.id] ?? "efectivo"}
                      onChange={(e) => setMedioInputs((prev) => ({ ...prev, [fila.id]: e.target.value as MedioPago }))}
                      className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                    >
                      {MEDIOS_PAGO.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {(medioInputs[fila.id] ?? "efectivo") === "efectivo" && (
                      <select
                        value={monedaInputs[fila.id] ?? "ARS"}
                        onChange={(e) => setMonedaInputs((prev) => ({ ...prev, [fila.id]: e.target.value as Moneda }))}
                        className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                      >
                        <option value="ARS">Pesos (ARS)</option>
                        <option value="USD">Dólares (USD)</option>
                      </select>
                    )}
                    <button
                      onClick={() => registrar(fila)}
                      disabled={isPending}
                      style={{ background: ACCENT }}
                      className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-55"
                    >
                      {isPending ? "Guardando…" : "Confirmar"}
                    </button>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft"
                    >
                      Cerrar
                    </button>
                  </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtradas.length === 0 && (
            <div className="px-5 py-11 text-center text-[13px] text-ink-faint">
              {filas.length === 0
                ? "No hay saldos pendientes — todos los pasajeros están al día."
                : "No se encontraron pasajeros con esos datos."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
