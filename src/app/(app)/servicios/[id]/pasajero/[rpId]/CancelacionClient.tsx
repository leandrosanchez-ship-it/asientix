"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelarPasajero, reprogramarPasajero } from "./actions";

const ACCENT = "#2E6E8E";

export type EstadoPasajero = "activo" | "cancelado" | "reprogramado";

export interface ServicioOption {
  id: string;
  label: string;
}

export interface EventoHistorial {
  titulo: string;
  fecha: string;
}

const MOTIVOS = ["Cliente desistió", "Cambio de planes", "Error de carga", "Otro"];

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export function CancelacionClient({
  servicioId,
  rpId,
  numero,
  clienteNombre,
  servicioLabel,
  estadoInicial,
  saldoPagado,
  proximasSalidas,
  historialInicial,
}: {
  servicioId: string;
  rpId: string;
  numero: number;
  clienteNombre: string;
  servicioLabel: string;
  estadoInicial: EstadoPasajero;
  saldoPagado: number;
  proximasSalidas: ServicioOption[];
  historialInicial: EventoHistorial[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [estado, setEstado] = useState(estadoInicial);
  const [mode, setMode] = useState<"cancelar" | "reprogramar">("cancelar");
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [reembolso, setReembolso] = useState(false);
  const [nuevaSalida, setNuevaSalida] = useState(proximasSalidas[0]?.id ?? "");
  const [historial, setHistorial] = useState(historialInicial);
  const [error, setError] = useState<string | null>(null);
  const [resuelto, setResuelto] = useState<{ tipo: "cancelada" | "reprogramada"; detalle: string } | null>(null);

  const isActiva = estado === "activo";

  function confirmarCancelacion() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelarPasajero({ reservaPasajeroId: rpId, motivo, reembolso });
        setEstado("cancelado");
        setHistorial((prev) => [
          ...prev,
          {
            titulo: `Asiento ${numero} cancelado — motivo: ${motivo}.${reembolso ? " Saldo marcado como reembolsado." : ""}`,
            fecha: new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
          },
        ]);
        setResuelto({ tipo: "cancelada", detalle: `El asiento ${numero} vuelve a quedar disponible en el mapa de asientos.` });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function confirmarReprogramacion() {
    if (!nuevaSalida) return;
    setError(null);
    const salida = proximasSalidas.find((s) => s.id === nuevaSalida);
    startTransition(async () => {
      try {
        await reprogramarPasajero({ reservaPasajeroId: rpId, nuevoServicioId: nuevaSalida });
        setEstado("reprogramado");
        setHistorial((prev) => [
          ...prev,
          {
            titulo: `Reprogramada a: ${salida?.label ?? nuevaSalida}`,
            fecha: new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
          },
        ]);
        setResuelto({
          tipo: "reprogramada",
          detalle: `${clienteNombre.split(",").reverse().join(" ").trim()} ahora viaja: ${salida?.label ?? ""}.`,
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  const statusStyle =
    estado === "activo"
      ? { bg: "#DCFCE7", color: "#15803D", label: "Activa" }
      : estado === "cancelado"
        ? { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelada" }
        : { bg: "#FEF3C7", color: "#92400E", label: "Reprogramada" };

  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <Link href={`/servicios/${servicioId}`} className="mb-3 inline-block text-xs font-bold text-accent">
        ← Volver al mapa de asientos
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-ink">Cancelar o reprogramar</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            Asiento {numero} · {clienteNombre} · {servicioLabel}
          </p>
        </div>
        <span
          className="rounded-full px-3.5 py-1.5 text-[11px] font-bold"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="mt-5 flex items-start gap-[18px]">
        <div className="flex-[1.2]">
          {isActiva && !resuelto ? (
            <>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setMode("cancelar")}
                  style={mode === "cancelar" ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E3E5EA", color: "#6B7280" }}
                  className="rounded-full border bg-white px-4 py-2.5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setMode("reprogramar")}
                  style={mode === "reprogramar" ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E3E5EA", color: "#6B7280" }}
                  className="rounded-full border bg-white px-4 py-2.5 text-xs font-bold"
                >
                  Reprogramar
                </button>
              </div>

              {mode === "cancelar" ? (
                <div className="rounded-2xl border border-line bg-white p-[22px]">
                  <div className="mb-1.5 text-xs text-ink-soft">Motivo</div>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="mb-4 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-accent"
                  >
                    {MOTIVOS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {saldoPagado > 0 && (
                    <button
                      onClick={() => setReembolso((v) => !v)}
                      className="mb-5 flex items-center gap-2.5 bg-none p-0 text-left"
                    >
                      <span
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px]"
                        style={{ borderColor: reembolso ? ACCENT : "#D8DBE2", background: reembolso ? ACCENT : "#fff" }}
                      >
                        {reembolso && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[13px] text-ink">
                        Marcar el saldo pagado ({fmt(saldoPagado)}) como reembolsado
                      </span>
                    </button>
                  )}

                  {error && <div className="mb-3 text-xs font-semibold text-red-600">{error}</div>}

                  <button
                    onClick={confirmarCancelacion}
                    disabled={isPending}
                    className="w-full rounded-[10px] bg-[#B91C1C] py-3 text-[13px] font-bold text-white disabled:opacity-55"
                  >
                    {isPending ? "Cancelando…" : "Confirmar cancelación"}
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-line bg-white p-[22px]">
                  <div className="mb-1.5 text-xs text-ink-soft">Nueva salida</div>
                  {proximasSalidas.length === 0 ? (
                    <div className="text-[13px] text-ink-faint">No hay otras salidas próximas cargadas todavía.</div>
                  ) : (
                    <>
                      <select
                        value={nuevaSalida}
                        onChange={(e) => setNuevaSalida(e.target.value)}
                        className="mb-5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-accent"
                      >
                        {proximasSalidas.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <div className="mb-[18px] text-xs text-ink-faint">
                        Se busca un asiento libre en el nuevo servicio (mismo número si está disponible); los datos
                        del pasajero se mantienen.
                      </div>
                      {error && <div className="mb-3 text-xs font-semibold text-red-600">{error}</div>}
                      <button
                        onClick={confirmarReprogramacion}
                        disabled={isPending}
                        style={{ background: ACCENT }}
                        className="w-full rounded-[10px] py-3 text-[13px] font-bold text-white disabled:opacity-55"
                      >
                        {isPending ? "Reprogramando…" : "Confirmar reprogramación"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div
              className="rounded-2xl border p-[22px]"
              style={{
                background: resuelto?.tipo === "cancelada" || estado === "cancelado" ? "#FEE2E2" : "#FEF3C7",
                borderColor: resuelto?.tipo === "cancelada" || estado === "cancelado" ? "#F8C6C6" : "#FBE0A0",
              }}
            >
              <div
                className="text-[13px] font-bold"
                style={{ color: resuelto?.tipo === "cancelada" || estado === "cancelado" ? "#B91C1C" : "#92400E" }}
              >
                {estado === "cancelado" ? "✓ Reserva cancelada" : "✓ Reserva reprogramada"}
              </div>
              <div className="mt-1.5 text-[13px] text-[#4B5563]">
                {resuelto?.detalle ??
                  (estado === "cancelado"
                    ? `El asiento ${numero} vuelve a quedar disponible en el mapa de asientos.`
                    : "Este pasajero ya fue movido a otra salida.")}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 rounded-2xl border border-line bg-white p-[22px]">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Historial</div>
          {historial.map((h, i) => (
            <div key={i} className="mb-4 flex gap-3 border-b border-[#EEF0F2] pb-4 last:mb-0 last:border-b-0 last:pb-0">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ACCENT }} />
              <div>
                <div className="text-[13px] font-semibold text-ink">{h.titulo}</div>
                <div className="mt-0.5 text-[11px] text-ink-faint">{h.fecha}</div>
              </div>
            </div>
          ))}
          {historial.length === 0 && <div className="text-[13px] text-ink-faint">Sin movimientos todavía.</div>}
        </div>
      </div>
    </div>
  );
}
