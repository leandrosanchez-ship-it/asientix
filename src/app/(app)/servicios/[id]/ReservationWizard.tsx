"use client";

import { useEffect, useState } from "react";
import type { CobroInicial, MedioPago, Moneda, RegimenComida, TipoHabitacion } from "@/lib/types";
import { parseArsMoney, capitalizarPalabras } from "@/lib/format";
import { HABITACIONES } from "@/lib/habitacion";
import { REGIMENES } from "@/lib/regimen";
import { buscarClientePorDni, type ClienteEditable } from "../../clientes/actions";

export interface PasajeroForm {
  nombre: string;
  apellido: string;
  dni: string;
  nacimiento: string;
  telefono: string;
  email: string;
  localidad: string;
  embarque: string;
  emerNombre: string;
  emerTelefono: string;
  emerParentesco: string;
  obraSocial: string;
  obraSocialNro: string;
  // Si se completó buscando por DNI un cliente ya cargado, se guarda acá su
  // id para que el server reutilice ese registro en vez de crear uno nuevo.
  clienteIdExistente?: string;
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
    embarque: "",
    emerNombre: "",
    emerTelefono: "",
    emerParentesco: "",
    obraSocial: "",
    obraSocialNro: "",
    clienteIdExistente: undefined,
  };
}

const PARENTESCOS = ["Padre/Madre", "Hermano/a", "Cónyuge", "Hijo/a", "Amigo/a", "Otro"];

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

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta de crédito" },
];

export function ReservationWizard({
  cart,
  precioPasaje,
  monedaServicio,
  tiposHabitacionDisponibles,
  onCancel,
  onFinish,
}: {
  cart: number[];
  precioPasaje: number | null; // null = el servicio no tiene precio fijo, se carga acá
  monedaServicio: Moneda;
  tiposHabitacionDisponibles: TipoHabitacion[];
  onCancel: () => void;
  onFinish: (
    forms: PasajeroForm[],
    responsableIdx: number,
    habitacion: TipoHabitacion | null,
    regimenComida: RegimenComida | null,
    cobro: CobroInicial,
    precioPasajeUsado: number,
  ) => void;
}) {
  const [index, setIndex] = useState(0);
  const [forms, setForms] = useState<PasajeroForm[]>(cart.map(() => emptyPasajeroForm()));
  const [responsableIdx, setResponsableIdx] = useState<number | null>(0);
  const [habitacion, setHabitacion] = useState<TipoHabitacion | "">("");
  const [regimen, setRegimen] = useState<RegimenComida | "">("");
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniEncontrado, setDniEncontrado] = useState<string | null>(null);

  // Si el servicio no trae precio fijo, se carga acá mismo al vender.
  const [precioIngresadoStr, setPrecioIngresadoStr] = useState("");
  const precioResuelto = precioPasaje ?? parseArsMoney(precioIngresadoStr);
  const precioTotal = precioResuelto * cart.length;
  const simbolo = monedaServicio === "USD" ? "US$" : "$";
  const fmtMonto = (n: number) => `${simbolo}${n.toLocaleString("es-AR")}`;

  const [montoAbonadoStr, setMontoAbonadoStr] = useState("0");
  const [montoTocado, setMontoTocado] = useState(false);
  useEffect(() => {
    if (!montoTocado) setMontoAbonadoStr(String(precioTotal));
  }, [precioTotal, montoTocado]);

  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [monedaPago, setMonedaPago] = useState<Moneda>("ARS");

  const PASO_COBRO = cart.length; // un paso más, después del último pasajero
  const isCobroStep = index === PASO_COBRO;
  const form = forms[Math.min(index, cart.length - 1)];
  const isLast = index === PASO_COBRO;
  const canAdvance = isCobroStep ? precioResuelto > 0 : !!(form.nombre && form.apellido);

  const montoAbonado = Math.max(0, Math.min(parseArsMoney(montoAbonadoStr), precioTotal));
  const saldoPendiente = Math.max(precioTotal - montoAbonado, 0);

  function setField(field: keyof PasajeroForm, value: string) {
    setForms((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function aplicarClienteEncontrado(c: ClienteEditable) {
    setForms((prev) => {
      const next = prev.slice();
      next[index] = {
        ...next[index],
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
      };
      return next;
    });
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

  function next() {
    if (!canAdvance) return;
    setIndex((i) => Math.min(PASO_COBRO, i + 1));
  }

  function finish() {
    if (precioResuelto <= 0) return;
    onFinish(
      forms,
      responsableIdx ?? 0,
      habitacion || null,
      regimen || null,
      {
        montoAbonado,
        medioPago,
        moneda: medioPago === "efectivo" ? monedaPago : null,
      },
      precioResuelto,
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/45 px-0 py-12">
      <div className="max-h-full w-[480px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-1.5 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
              {isCobroStep ? "Último paso" : `Pasajero ${index + 1} de ${cart.length}`}
            </div>
            <h2 className="mt-0.5 text-[17px] font-extrabold text-ink">
              {isCobroStep ? "Cobro" : `Asiento ${cart[index]}`}
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

        {!isCobroStep ? (
          <>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
              Datos básicos
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
                {dniEncontrado === "" && (
                  <div className="mt-1 text-[11px] text-ink-faint">No hay ningún cliente con ese DNI todavía.</div>
                )}
                {dniEncontrado && (
                  <div className="mt-1 text-[11px] font-semibold text-[#15803D]">
                    ✓ Se completó con los datos de {dniEncontrado}
                  </div>
                )}
              </div>
              <Field label="Fecha de nacimiento" value={form.nacimiento} onChange={(v) => setField("nacimiento", v)} type="date" />
              <Field label="Teléfono" value={form.telefono} onChange={(v) => setField("telefono", v)} placeholder="351 555-0000" />
              <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} placeholder="nombre@mail.com" />
              <Field label="Localidad" value={form.localidad} onChange={(v) => setField("localidad", v)} placeholder="Villa Carlos Paz, Córdoba" />
              <Field label="Embarque" value={form.embarque} onChange={(v) => setField("embarque", v)} placeholder="Ej. Cosquín" />
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

                <div className="mt-3">
                  <div className="mb-1 text-xs text-ink-soft">Régimen de comida (opcional)</div>
                  <select
                    value={regimen}
                    onChange={(e) => setRegimen(e.target.value as RegimenComida | "")}
                    className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                  >
                    <option value="">Sin definir</option>
                    {REGIMENES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
              ¿Cómo se abona?
            </div>

            {precioPasaje === null && (
              <div className="mb-3.5">
                <div className="mb-1 text-xs text-ink-soft">
                  Este servicio no tiene precio fijo — precio del pasaje (por persona)
                </div>
                <input
                  value={precioIngresadoStr}
                  onChange={(e) => setPrecioIngresadoStr(e.target.value)}
                  placeholder="$ 45.000"
                  className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                />
              </div>
            )}

            <div className="rounded-[10px] border border-line bg-[#F7F8F7] p-3.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-soft">Precio total ({cart.length} {cart.length === 1 ? "pasaje" : "pasajes"})</span>
                <span className="font-bold text-ink">{fmtMonto(precioTotal)}</span>
              </div>
            </div>

            <div className="mt-3.5">
              <div className="mb-1 text-xs text-ink-soft">Monto abonado ahora</div>
              <input
                value={montoAbonadoStr}
                onChange={(e) => {
                  setMontoTocado(true);
                  setMontoAbonadoStr(e.target.value);
                }}
                placeholder="0"
                className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
              />
            </div>

            <div className="mt-3.5">
              <div className="mb-1 text-xs text-ink-soft">Medio de pago</div>
              <div className="flex gap-2">
                {MEDIOS_PAGO.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMedioPago(m.value)}
                    style={
                      medioPago === m.value
                        ? { background: "#2563EB", borderColor: "#2563EB", color: "#fff" }
                        : { borderColor: "#E3E5EA", color: "#6B7280" }
                    }
                    className="flex-1 rounded-[9px] border px-2.5 py-2.5 text-[12.5px] font-bold"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {medioPago === "efectivo" && (
              <div className="mt-3.5">
                <div className="mb-1 text-xs text-ink-soft">Moneda</div>
                <div className="flex gap-2">
                  {(["ARS", "USD"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonedaPago(m)}
                      style={
                        monedaPago === m
                          ? { background: "#2563EB", borderColor: "#2563EB", color: "#fff" }
                          : { borderColor: "#E3E5EA", color: "#6B7280" }
                      }
                      className="flex-1 rounded-[9px] border px-2.5 py-2.5 text-[12.5px] font-bold"
                    >
                      {m === "ARS" ? "Pesos (ARS)" : "Dólares (USD)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className="mt-[18px] rounded-[10px] px-4 py-3.5"
              style={{
                background: saldoPendiente > 0 ? "#FEF3C7" : "#DCFCE7",
                border: `1px solid ${saldoPendiente > 0 ? "#FBE0A0" : "#BBF0CE"}`,
              }}
            >
              <div
                className="text-[11px] font-bold uppercase"
                style={{ color: saldoPendiente > 0 ? "#92400E" : "#15803D" }}
              >
                {saldoPendiente > 0 ? "Queda saldo pendiente" : "Se paga en su totalidad"}
              </div>
              {saldoPendiente > 0 && (
                <div className="mt-0.5 text-sm font-extrabold" style={{ color: "#92400E" }}>
                  {fmtMonto(saldoPendiente)}
                </div>
              )}
            </div>
          </>
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
