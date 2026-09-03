"use client";

import { useMemo, useState } from "react";
import type {
  Asiento,
  AsistenciaViajero,
  Cliente,
  Hotel,
  Observacion,
  Pago,
  Reserva,
  ReservaPasajero,
  Servicio,
  TipoHabitacion,
} from "@/lib/types";
import { SUPERIOR_IDS, INFERIOR_IDS, AGENCIA_SEQUEIRA } from "@/lib/mock-data";
import { SeatMap, type SeatVM } from "./SeatMap";
import { ReservationWizard, type PasajeroForm } from "./ReservationWizard";
import { SeatDetailModal, habitacionLabel, type GrupoInfo } from "./SeatDetailModal";

const ACCENT = "#2E6E8E";
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatFecha(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function slug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function MapaAsientosClient({
  servicio,
  asientosIniciales,
  clientesIniciales,
  reservasIniciales,
  reservaPasajerosIniciales,
  hotel,
  asistencia,
  observaciones,
}: {
  servicio: Servicio;
  asientosIniciales: Asiento[];
  clientesIniciales: Cliente[];
  reservasIniciales: Reserva[];
  reservaPasajerosIniciales: ReservaPasajero[];
  hotel: Hotel | null;
  asistencia: AsistenciaViajero | null;
  observaciones: Observacion[];
}) {
  const [asientos, setAsientos] = useState(asientosIniciales);
  const [clientes, setClientes] = useState(clientesIniciales);
  const [reservas, setReservas] = useState(reservasIniciales);
  const [reservaPasajeros, setReservaPasajeros] = useState(reservaPasajerosIniciales);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [floor, setFloor] = useState<"superior" | "inferior">("superior");
  const [cart, setCart] = useState<number[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [modalNumero, setModalNumero] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const clientesById = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const rpByAsientoId = useMemo(
    () => new Map(reservaPasajeros.map((rp) => [rp.asientoId, rp])),
    [reservaPasajeros],
  );
  const reservasById = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);

  const seatsByNumero = useMemo(() => {
    const map = new Map<number, SeatVM>();
    asientos.forEach((asiento) => {
      const rp = rpByAsientoId.get(asiento.id);
      const cliente = rp ? clientesById.get(rp.clienteId) ?? null : null;
      map.set(asiento.numero, { asiento, cliente, esResponsable: rp?.esResponsable ?? false });
    });
    return map;
  }, [asientos, rpByAsientoId, clientesById]);

  function pagadoDe(reservaPasajeroId: string) {
    return pagos
      .filter((p) => p.reservaPasajeroId === reservaPasajeroId)
      .reduce((sum, p) => sum + p.monto, 0);
  }

  const floorSeats = (floor === "superior" ? SUPERIOR_IDS : INFERIOR_IDS).map((n) => seatsByNumero.get(n)!);
  const total = floorSeats.length;
  const ocupados = floorSeats.filter((s) => s.asiento.estado === "ocupado").length;
  const pendientes = floorSeats.filter((s) => s.asiento.estado === "pendiente").length;
  const libres = total - ocupados - pendientes;
  const superiorLibres = SUPERIOR_IDS.filter((n) => seatsByNumero.get(n)?.asiento.estado === "libre").length;
  const inferiorLibres = INFERIOR_IDS.filter((n) => seatsByNumero.get(n)?.asiento.estado === "libre").length;

  const cartSet = useMemo(() => new Set(cart), [cart]);

  function onSeatClick(numero: number) {
    const seat = seatsByNumero.get(numero);
    if (!seat) return;
    if (seat.asiento.estado === "libre") {
      setCart((prev) => (prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero]));
    } else {
      setModalNumero(numero);
    }
  }

  function onWizardFinish(forms: PasajeroForm[], responsableIdx: number, habitacionTipo: TipoHabitacion | null) {
    const reservaId = nextId("reserva");
    const codigoValidacion = `AXT-${slug(servicio.destino).slice(0, 3).toUpperCase()}${servicio.fecha.replace(/-/g, "")}-${nextId("").slice(-5).toUpperCase()}`;

    const nuevaReserva: Reserva = {
      id: reservaId,
      agenciaId: AGENCIA_SEQUEIRA.id,
      servicioId: servicio.id,
      habitacionTipo,
      codigoValidacion,
    };

    const nuevosClientes: Cliente[] = [];
    const nuevosRP: ReservaPasajero[] = [];

    cart.forEach((numero, idx) => {
      const form = forms[idx];
      const asiento = seatsByNumero.get(numero)!.asiento;
      const clienteId = nextId("cliente");
      nuevosClientes.push({ id: clienteId, agenciaId: AGENCIA_SEQUEIRA.id, ...form });
      nuevosRP.push({
        id: nextId("rp"),
        reservaId,
        asientoId: asiento.id,
        clienteId,
        esResponsable: idx === responsableIdx,
        precio: servicio.precioPasaje,
      });
    });

    setClientes((prev) => [...prev, ...nuevosClientes]);
    setReservas((prev) => [...prev, nuevaReserva]);
    setReservaPasajeros((prev) => [...prev, ...nuevosRP]);
    setAsientos((prev) =>
      prev.map((a) => (cart.includes(a.numero) ? { ...a, estado: "ocupado" } : a)),
    );

    setCart([]);
    setWizardOpen(false);
  }

  function onMarcarPagado(numero: number) {
    const seat = seatsByNumero.get(numero);
    const rp = seat && rpByAsientoId.get(seat.asiento.id);
    if (!seat || !rp) return;
    const saldo = rp.precio - pagadoDe(rp.id);
    if (saldo <= 0) return;

    setPagos((prev) => [
      ...prev,
      { id: nextId("pago"), reservaPasajeroId: rp.id, monto: saldo, medioPago: "efectivo", fecha: new Date().toISOString() },
    ]);
    setAsientos((prev) =>
      prev.map((a) => (a.numero === numero && a.estado === "pendiente" ? { ...a, estado: "ocupado" } : a)),
    );
  }

  function grupoDe(numero: number): GrupoInfo | null {
    const seat = seatsByNumero.get(numero);
    const rp = seat && rpByAsientoId.get(seat.asiento.id);
    const reserva = rp && reservasById.get(rp.reservaId);
    if (!rp || !reserva) return null;

    const asientosDelGrupo = reservaPasajeros
      .filter((x) => x.reservaId === reserva.id)
      .map((x) => asientos.find((a) => a.id === x.asientoId)?.numero)
      .filter((n): n is number => n !== undefined)
      .sort((a, b) => a - b);

    if (asientosDelGrupo.length <= 1) return null;

    const responsableRP = reservaPasajeros.find((x) => x.reservaId === reserva.id && x.esResponsable);
    const responsableCliente = responsableRP && clientesById.get(responsableRP.clienteId);

    return {
      cantidad: asientosDelGrupo.length,
      asientos: asientosDelGrupo,
      responsableNombre: responsableCliente ? `${responsableCliente.nombre} ${responsableCliente.apellido}` : null,
      habitacionLabel: habitacionLabel(reserva.habitacionTipo),
    };
  }

  function onDescargarBoleto(numero: number) {
    const seat = seatsByNumero.get(numero);
    const grupo = grupoDe(numero);
    if (!seat) return;
    if (grupo) {
      const responsable = seat.cliente ? `${seat.cliente.apellido}-${seat.cliente.nombre}` : "pasajero";
      setToast(`✓ Se descargó boleto-grupal-${slug(responsable)}-asientos-${grupo.asientos.join("-")}.pdf`);
    } else {
      const nombre = seat.cliente ? `${seat.cliente.apellido}-${seat.cliente.nombre}` : "pasajero";
      setToast(`✓ Se descargó boleto-${slug(nombre)}-asiento${numero}.pdf`);
    }
  }

  const modalSeat = modalNumero !== null ? seatsByNumero.get(modalNumero) : null;
  const modalRP = modalSeat && rpByAsientoId.get(modalSeat.asiento.id);

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      <div className="flex items-center justify-between border-b border-line bg-white px-8 py-5">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-[19px] font-extrabold text-ink">
              {servicio.origen} → {servicio.destino}
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-soft">
              {formatFecha(servicio.fecha)} · {servicio.hora} hs · {servicio.tipoCoche} · {servicio.unidad}
            </div>
            {(hotel || asistencia || observaciones.length > 0) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {hotel && <Badge>🏨 {hotel.nombre}</Badge>}
                {asistencia && <Badge>🛟 {asistencia.nombre}</Badge>}
                {observaciones.length > 0 && (
                  <Badge>
                    📋 {observaciones.length} observación{observaciones.length === 1 ? "" : "es"}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2.5">
          <Stat label="Total" value={total} bg="#F4F5F7" fg="#1C1F27" />
          <Stat label="Libres" value={libres} bg="#DCFCE7" fg="#15803D" />
          <Stat label="Ocupados" value={ocupados} bg="#FEE2E2" fg="#B91C1C" />
          <Stat label="Seña" value={pendientes} bg="#FEF3C7" fg="#92400E" />
        </div>
      </div>

      {toast && (
        <div className="mx-8 mt-4 rounded-[10px] border border-[#BBF0CE] bg-[#DCFCE7] px-4 py-3 text-xs font-bold text-[#15803D]">
          {toast}
        </div>
      )}

      {cart.length > 0 && (
        <div className="flex items-center justify-between bg-[#1C1F27] px-8 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-xs font-extrabold">
              {cart.length}
            </span>
            <span className="text-[13px] font-semibold">
              {cart.length === 1 ? "asiento" : "asientos"} seleccionado{cart.length === 1 ? "" : "s"} · asientos{" "}
              {cart.slice().sort((a, b) => a - b).join(", ")}
            </span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setCart([])}
              className="rounded-lg border border-[#3A3F4A] px-4 py-2 text-xs font-bold text-[#C7CBD1]"
            >
              Vaciar
            </button>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="rounded-lg bg-[#2563EB] px-[18px] py-2 text-xs font-bold text-white"
            >
              Reservar
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2.5 border-b border-line bg-white px-8 py-3.5">
        <FloorTab active={floor === "superior"} onClick={() => setFloor("superior")}>
          Piso superior · Semi cama <span className="opacity-75">({superiorLibres} libres)</span>
        </FloorTab>
        <FloorTab active={floor === "inferior"} onClick={() => setFloor("inferior")}>
          Piso inferior · Cama <span className="opacity-75">({inferiorLibres} libres)</span>
        </FloorTab>
      </div>

      <div className="flex flex-1 justify-center p-9">
        <SeatMap piso={floor} seatsByNumero={seatsByNumero} cartSet={cartSet} onSeatClick={onSeatClick} accent={ACCENT} />
      </div>

      {wizardOpen && (
        <ReservationWizard
          cart={cart}
          tiposHabitacionDisponibles={servicio.incluyeHotel ? servicio.tiposHabitacionDisponibles : []}
          onCancel={() => setWizardOpen(false)}
          onFinish={onWizardFinish}
        />
      )}

      {modalSeat && modalRP && modalSeat.cliente && (
        <SeatDetailModal
          numero={modalNumero!}
          cliente={modalSeat.cliente}
          saldo={modalRP.precio - pagadoDe(modalRP.id)}
          precioTotal={modalRP.precio}
          grupo={grupoDe(modalNumero!)}
          accent={ACCENT}
          onClose={() => setModalNumero(null)}
          onMarcarPagado={() => onMarcarPagado(modalNumero!)}
          onDescargarBoleto={() => onDescargarBoleto(modalNumero!)}
        />
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#F4F5F7] px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}

function Stat({ label, value, bg, fg }: { label: string; value: number; bg: string; fg: string }) {
  return (
    <div style={{ background: bg, color: fg }} className="min-w-[76px] rounded-[10px] px-3.5 py-2 text-center">
      <div className="text-[17px] font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase">{label}</div>
    </div>
  );
}

function FloorTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { background: ACCENT, color: "#fff" } : { color: "#6B7280" }}
      className={`rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold ${active ? "" : "border border-line bg-white"}`}
    >
      {children}
    </button>
  );
}
