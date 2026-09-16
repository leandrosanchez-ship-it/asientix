"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AsistenciaViajero, Coordinador, Hotel, Moneda, Observacion, Transporte, TipoHabitacion } from "@/lib/types";
import { crearServicio } from "./actions";
import { crearHotel, crearAsistencia, crearCoordinador, crearTransporte } from "../../proveedores/actions";
import { ACCENT } from "@/lib/theme";
import { HABITACIONES } from "@/lib/habitacion";

const NUEVO = "__nuevo__";
const TIPOS_COCHE = ["Semi-Cama", "Cama", "Ambos"];

interface Form {
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  tipo: string;
  unidad: string;
  asientos: string;
  precio: string;
  moneda: Moneda;
  hotelId: string;
  cantidadHabitaciones: string;
  asistenciaId: string;
  coordinadorId: string;
  transporteId: string;
  excursionObservaciones: string;
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
    moneda: "ARS",
    hotelId: "",
    cantidadHabitaciones: "",
    asistenciaId: "",
    coordinadorId: "",
    transporteId: "",
    excursionObservaciones: "",
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
  coordinadores,
  transportes,
  observaciones,
}: {
  hoteles: Hotel[];
  asistencias: AsistenciaViajero[];
  coordinadores: Coordinador[];
  transportes: Transporte[];
  observaciones: Observacion[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(emptyForm());
  const [incluyeHotel, setIncluyeHotel] = useState(false);
  const [incluyeAsistencia, setIncluyeAsistencia] = useState(false);
  const [incluyeExcursion, setIncluyeExcursion] = useState(false);
  const [selectedObs, setSelectedObs] = useState<string[]>([]);
  const [selectedHab, setSelectedHab] = useState<TipoHabitacion[]>([]);
  const [saved, setSaved] = useState(false);
  const [nuevoServicioId, setNuevoServicioId] = useState<string | null>(null);

  const [coordinadoresLocal, setCoordinadoresLocal] = useState(coordinadores);
  const [transportesLocal, setTransportesLocal] = useState(transportes);
  const [nuevoCoordinador, setNuevoCoordinador] = useState({ nombre: "", apellido: "", telefono: "" });
  const [nuevoTransporte, setNuevoTransporte] = useState({ nombre: "", contacto: "" });
  const [mostrarNuevoCoordinador, setMostrarNuevoCoordinador] = useState(false);
  const [mostrarNuevoTransporte, setMostrarNuevoTransporte] = useState(false);

  // Copias locales de las listas de Proveedores — para que un hotel/asistencia
  // cargado al vuelo aparezca al toque en el <select>, sin recargar la página.
  const [hotelesLocal, setHotelesLocal] = useState(hoteles);
  const [asistenciasLocal, setAsistenciasLocal] = useState(asistencias);
  const [nuevoHotel, setNuevoHotel] = useState({ nombre: "", telefono: "" });
  const [nuevaAsistencia, setNuevaAsistencia] = useState({ nombre: "", telefono: "" });
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [proveedorError, setProveedorError] = useState<string | null>(null);
  const [mostrarNuevoHotel, setMostrarNuevoHotel] = useState(false);
  const [mostrarNuevaAsistencia, setMostrarNuevaAsistencia] = useState(false);

  function setField<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleObs(id: string) {
    setSelectedObs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleHab(v: TipoHabitacion) {
    setSelectedHab((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  function guardarNuevoHotel() {
    if (!nuevoHotel.nombre.trim()) return;
    setProveedorError(null);
    setCreandoProveedor(true);
    startTransition(async () => {
      try {
        const id = await crearHotel({ nombre: nuevoHotel.nombre, contacto: "", telefono: nuevoHotel.telefono, direccion: "" });
        setHotelesLocal((prev) => [...prev, { id, agenciaId: "", nombre: nuevoHotel.nombre.trim(), contacto: "", telefono: nuevoHotel.telefono, direccion: "" }]);
        setField("hotelId", id);
        setNuevoHotel({ nombre: "", telefono: "" });
        setMostrarNuevoHotel(false);
      } catch (e) {
        setProveedorError(e instanceof Error ? e.message : "No se pudo crear el hotel");
      } finally {
        setCreandoProveedor(false);
      }
    });
  }

  function guardarNuevaAsistencia() {
    if (!nuevaAsistencia.nombre.trim()) return;
    setProveedorError(null);
    setCreandoProveedor(true);
    startTransition(async () => {
      try {
        const id = await crearAsistencia({
          nombre: nuevaAsistencia.nombre,
          contacto: "",
          telefono: nuevaAsistencia.telefono,
          topeCoberturaMoneda: null,
          topeCoberturaMonto: null,
        });
        setAsistenciasLocal((prev) => [
          ...prev,
          { id, agenciaId: "", nombre: nuevaAsistencia.nombre.trim(), contacto: "", telefono: nuevaAsistencia.telefono, topeCoberturaMoneda: null, topeCoberturaMonto: null },
        ]);
        setField("asistenciaId", id);
        setNuevaAsistencia({ nombre: "", telefono: "" });
        setMostrarNuevaAsistencia(false);
      } catch (e) {
        setProveedorError(e instanceof Error ? e.message : "No se pudo crear la asistencia");
      } finally {
        setCreandoProveedor(false);
      }
    });
  }

  function guardarNuevoCoordinador() {
    if (!nuevoCoordinador.nombre.trim()) return;
    setProveedorError(null);
    setCreandoProveedor(true);
    startTransition(async () => {
      try {
        const id = await crearCoordinador(nuevoCoordinador);
        setCoordinadoresLocal((prev) => [...prev, { id, agenciaId: "", ...nuevoCoordinador }]);
        setField("coordinadorId", id);
        setNuevoCoordinador({ nombre: "", apellido: "", telefono: "" });
        setMostrarNuevoCoordinador(false);
      } catch (e) {
        setProveedorError(e instanceof Error ? e.message : "No se pudo crear el coordinador");
      } finally {
        setCreandoProveedor(false);
      }
    });
  }

  function guardarNuevoTransporte() {
    if (!nuevoTransporte.nombre.trim()) return;
    setProveedorError(null);
    setCreandoProveedor(true);
    startTransition(async () => {
      try {
        const id = await crearTransporte(nuevoTransporte);
        setTransportesLocal((prev) => [...prev, { id, agenciaId: "", ...nuevoTransporte }]);
        setField("transporteId", id);
        setNuevoTransporte({ nombre: "", contacto: "" });
        setMostrarNuevoTransporte(false);
      } catch (e) {
        setProveedorError(e instanceof Error ? e.message : "No se pudo crear el transporte");
      } finally {
        setCreandoProveedor(false);
      }
    });
  }

  function reset() {
    setForm(emptyForm());
    setIncluyeHotel(false);
    setIncluyeAsistencia(false);
    setIncluyeExcursion(false);
    setSelectedObs([]);
    setSelectedHab([]);
    setSaved(false);
    setNuevoServicioId(null);
    setError(null);
    setMostrarNuevoHotel(false);
    setMostrarNuevaAsistencia(false);
    setMostrarNuevoCoordinador(false);
    setMostrarNuevoTransporte(false);
    setNuevoHotel({ nombre: "", telefono: "" });
    setNuevaAsistencia({ nombre: "", telefono: "" });
    setNuevoCoordinador({ nombre: "", apellido: "", telefono: "" });
    setNuevoTransporte({ nombre: "", contacto: "" });
    setProveedorError(null);
  }

  const canSave = !!(form.destino && form.fecha);

  function save() {
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await crearServicio({
          origen: form.origen,
          destino: form.destino,
          fecha: form.fecha,
          hora: form.hora,
          tipoCoche: form.tipo,
          unidad: form.unidad,
          precioPasaje: form.precio,
          moneda: form.moneda,
          incluyeHotel,
          hotelId: form.hotelId,
          tiposHabitacionDisponibles: selectedHab,
          cantidadHabitaciones: form.cantidadHabitaciones,
          incluyeAsistencia,
          asistenciaId: form.asistenciaId,
          incluyeExcursion,
          excursionObservaciones: form.excursionObservaciones,
          coordinadorId: form.coordinadorId,
          transporteId: form.transporteId,
          observacionesIds: selectedObs,
        });
        setNuevoServicioId(id);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function irAlMapa() {
    if (nuevoServicioId) router.push(`/servicios/${nuevoServicioId}`);
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
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Field label="Unidad / coche" value={form.unidad} onChange={(v) => setField("unidad", v)} placeholder="Ej. Coche 12" />
          <div>
            <Field
              label="Cantidad de asientos"
              value={form.asientos}
              onChange={(v) => {
                // Nunca más de 90 butacas — el resto de dígitos se recorta al tipear.
                if (v === "" || (/^\d+$/.test(v) && Number(v) <= 90)) setField("asientos", v);
              }}
              placeholder="40"
              type="number"
            />
            <div className="mt-1 text-[11.5px] text-ink-faint">Máximo 90 butacas por coche.</div>
          </div>
          <div>
            <Field label="Precio del pasaje (opcional)" value={form.precio} onChange={(v) => setField("precio", v)} placeholder="$ 45.000" />
            <div className="mt-1 text-[11.5px] text-ink-faint">
              Si todavía no lo definiste, dejalo vacío — lo vas a poder cargar al vender cada asiento.
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-ink-soft">Moneda</div>
            <select
              value={form.moneda}
              onChange={(e) => setField("moneda", e.target.value as Moneda)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-accent"
            >
              <option value="ARS">Pesos (ARS)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
            <div className="mt-1 text-[11.5px] text-ink-faint">Define en qué moneda se ve el saldo en Cobros.</div>
          </div>
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
                  value={mostrarNuevoHotel ? NUEVO : form.hotelId}
                  onChange={(e) => {
                    if (e.target.value === NUEVO) {
                      setMostrarNuevoHotel(true);
                      setField("hotelId", "");
                    } else {
                      setMostrarNuevoHotel(false);
                      setField("hotelId", e.target.value);
                    }
                  }}
                  className="mt-2.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                >
                  <option value="">Seleccionar hotel…</option>
                  {hotelesLocal.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre}
                    </option>
                  ))}
                  <option value={NUEVO}>+ Agregar nuevo hotel…</option>
                </select>

                {mostrarNuevoHotel && (
                  <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-dashed border-[#C7CBD1] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                      Nuevo hotel — queda guardado en Proveedores
                    </div>
                    <input
                      value={nuevoHotel.nombre}
                      onChange={(e) => setNuevoHotel((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Nombre del hotel"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                    />
                    <input
                      value={nuevoHotel.telefono}
                      onChange={(e) => setNuevoHotel((p) => ({ ...p, telefono: e.target.value }))}
                      placeholder="Teléfono de contacto (opcional)"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                    />
                    {proveedorError && <div className="text-xs font-semibold text-red-600">{proveedorError}</div>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarNuevoHotel(false);
                          setNuevoHotel({ nombre: "", telefono: "" });
                        }}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={guardarNuevoHotel}
                        disabled={!nuevoHotel.nombre.trim() || creandoProveedor}
                        style={{ background: ACCENT }}
                        className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-55"
                      >
                        {creandoProveedor ? "Guardando…" : "Agregar y usar"}
                      </button>
                    </div>
                  </div>
                )}

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

                <div className="mt-3 max-w-[220px]">
                  <Field
                    label="Cantidad de habitaciones"
                    value={form.cantidadHabitaciones}
                    onChange={(v) => (/^\d*$/.test(v) ? setField("cantidadHabitaciones", v) : null)}
                    placeholder="Ej. 15"
                    type="number"
                  />
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
              <>
                <select
                  value={mostrarNuevaAsistencia ? NUEVO : form.asistenciaId}
                  onChange={(e) => {
                    if (e.target.value === NUEVO) {
                      setMostrarNuevaAsistencia(true);
                      setField("asistenciaId", "");
                    } else {
                      setMostrarNuevaAsistencia(false);
                      setField("asistenciaId", e.target.value);
                    }
                  }}
                  className="mt-2.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                >
                  <option value="">Seleccionar asistencia…</option>
                  {asistenciasLocal.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                  <option value={NUEVO}>+ Agregar nueva asistencia…</option>
                </select>

                {mostrarNuevaAsistencia && (
                  <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-dashed border-[#C7CBD1] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                      Nueva asistencia — queda guardada en Proveedores
                    </div>
                    <input
                      value={nuevaAsistencia.nombre}
                      onChange={(e) => setNuevaAsistencia((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Nombre de la empresa de asistencia"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                    />
                    <input
                      value={nuevaAsistencia.telefono}
                      onChange={(e) => setNuevaAsistencia((p) => ({ ...p, telefono: e.target.value }))}
                      placeholder="Teléfono de contacto (opcional)"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                    />
                    {proveedorError && <div className="text-xs font-semibold text-red-600">{proveedorError}</div>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarNuevaAsistencia(false);
                          setNuevaAsistencia({ nombre: "", telefono: "" });
                        }}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={guardarNuevaAsistencia}
                        disabled={!nuevaAsistencia.nombre.trim() || creandoProveedor}
                        style={{ background: ACCENT }}
                        className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-55"
                      >
                        {creandoProveedor ? "Guardando…" : "Agregar y usar"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Excursión */}
          <div className="rounded-[10px] border border-line p-3.5">
            <button
              type="button"
              onClick={() => setIncluyeExcursion((v) => !v)}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <Check checked={incluyeExcursion} />
              <span className="text-[13px] font-semibold text-ink">¿Incluye excursión?</span>
            </button>
            {incluyeExcursion && (
              <div className="mt-2.5">
                <Field
                  label="Observaciones de la excursión"
                  value={form.excursionObservaciones}
                  onChange={(v) => setField("excursionObservaciones", v)}
                  placeholder="Ej. Excursión a las Sierras, salida 9hs, incluye almuerzo"
                />
              </div>
            )}
          </div>

          {/* Coordinador */}
          <div className="rounded-[10px] border border-line p-3.5">
            <div className="mb-2.5 text-[13px] font-semibold text-ink">Coordinador (opcional)</div>
            <select
              value={mostrarNuevoCoordinador ? NUEVO : form.coordinadorId}
              onChange={(e) => {
                if (e.target.value === NUEVO) {
                  setMostrarNuevoCoordinador(true);
                  setField("coordinadorId", "");
                } else {
                  setMostrarNuevoCoordinador(false);
                  setField("coordinadorId", e.target.value);
                }
              }}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            >
              <option value="">Sin coordinador</option>
              {coordinadoresLocal.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apellido}, {c.nombre}
                </option>
              ))}
              <option value={NUEVO}>+ Agregar nuevo coordinador…</option>
            </select>
            {mostrarNuevoCoordinador && (
              <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-dashed border-[#C7CBD1] p-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  Nuevo coordinador — queda guardado en Proveedores
                </div>
                <input
                  value={nuevoCoordinador.nombre}
                  onChange={(e) => setNuevoCoordinador((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre"
                  className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                />
                <input
                  value={nuevoCoordinador.apellido}
                  onChange={(e) => setNuevoCoordinador((p) => ({ ...p, apellido: e.target.value }))}
                  placeholder="Apellido"
                  className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                />
                <input
                  value={nuevoCoordinador.telefono}
                  onChange={(e) => setNuevoCoordinador((p) => ({ ...p, telefono: e.target.value }))}
                  placeholder="Teléfono (opcional)"
                  className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                />
                {proveedorError && <div className="text-xs font-semibold text-red-600">{proveedorError}</div>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarNuevoCoordinador(false);
                      setNuevoCoordinador({ nombre: "", apellido: "", telefono: "" });
                    }}
                    className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardarNuevoCoordinador}
                    disabled={!nuevoCoordinador.nombre.trim() || creandoProveedor}
                    style={{ background: ACCENT }}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-55"
                  >
                    {creandoProveedor ? "Guardando…" : "Agregar y usar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transporte */}
          <div className="rounded-[10px] border border-line p-3.5">
            <div className="mb-2.5 text-[13px] font-semibold text-ink">Transporte (opcional)</div>
            <select
              value={mostrarNuevoTransporte ? NUEVO : form.transporteId}
              onChange={(e) => {
                if (e.target.value === NUEVO) {
                  setMostrarNuevoTransporte(true);
                  setField("transporteId", "");
                } else {
                  setMostrarNuevoTransporte(false);
                  setField("transporteId", e.target.value);
                }
              }}
              className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            >
              <option value="">Sin transporte</option>
              {transportesLocal.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
              <option value={NUEVO}>+ Agregar nuevo transporte…</option>
            </select>
            {mostrarNuevoTransporte && (
              <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-dashed border-[#C7CBD1] p-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  Nuevo transporte — queda guardado en Proveedores
                </div>
                <input
                  value={nuevoTransporte.nombre}
                  onChange={(e) => setNuevoTransporte((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre"
                  className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                />
                <input
                  value={nuevoTransporte.contacto}
                  onChange={(e) => setNuevoTransporte((p) => ({ ...p, contacto: e.target.value }))}
                  placeholder="Contacto (opcional)"
                  className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
                />
                {proveedorError && <div className="text-xs font-semibold text-red-600">{proveedorError}</div>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarNuevoTransporte(false);
                      setNuevoTransporte({ nombre: "", contacto: "" });
                    }}
                    className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardarNuevoTransporte}
                    disabled={!nuevoTransporte.nombre.trim() || creandoProveedor}
                    style={{ background: ACCENT }}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-55"
                  >
                    {creandoProveedor ? "Guardando…" : "Agregar y usar"}
                  </button>
                </div>
              </div>
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
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={reset}
                className="whitespace-nowrap rounded-lg border border-[#BBF0CE] bg-white px-3.5 py-2 text-xs font-bold text-[#15803D]"
              >
                Cargar otro
              </button>
              <button
                type="button"
                onClick={irAlMapa}
                style={{ background: ACCENT }}
                className="whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold text-white"
              >
                Ver mapa de asientos →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2.5">
            {error && <div className="text-xs font-semibold text-red-600">{error}</div>}
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
                disabled={!canSave || isPending}
                style={{ background: ACCENT }}
                className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                {isPending ? "Guardando…" : "Guardar servicio"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
