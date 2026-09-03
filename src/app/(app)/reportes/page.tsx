import { createClient } from "@/lib/supabase/server";
import { ReportesClient, type MesData, type Movimiento, type ServicioOption } from "./ReportesClient";

const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function mesKey(iso: string) {
  return iso.slice(0, 7); // "YYYY-MM"
}
function mesLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MESES_LABEL[m - 1]} ${y}`;
}
function fechaCorta(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}
function fechaDDMMYYYY(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function ReportesPage() {
  const supabase = await createClient();

  const { data: serviciosData } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha")
    .order("fecha", { ascending: false });
  const servicios = serviciosData ?? [];
  const servicioIds = servicios.map((s) => s.id);
  const servicioPorId = new Map(servicios.map((s) => [s.id, s]));

  const { data: asientosData } =
    servicioIds.length > 0
      ? await supabase.from("asientos").select("id, servicio_id").in("servicio_id", servicioIds)
      : { data: [] };
  const servicioPorAsiento = new Map((asientosData ?? []).map((a) => [a.id, a.servicio_id]));
  const asientoIds = (asientosData ?? []).map((a) => a.id);

  const { data: rpData } =
    asientoIds.length > 0
      ? await supabase.from("reserva_pasajeros").select("id, asiento_id, cliente_id, precio").in("asiento_id", asientoIds)
      : { data: [] };
  const rps = rpData ?? [];
  const rpIds = rps.map((rp) => rp.id);
  const clienteIds = [...new Set(rps.map((rp) => rp.cliente_id))];

  const [{ data: pagosData }, { data: clientesData }] = await Promise.all([
    rpIds.length > 0
      ? supabase.from("pagos").select("reserva_pasajero_id, monto, medio_pago, fecha").in("reserva_pasajero_id", rpIds)
      : Promise.resolve({ data: [] }),
    clienteIds.length > 0
      ? supabase.from("clientes").select("id, nombre, apellido").in("id", clienteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));
  const rpPorId = new Map(rps.map((rp) => [rp.id, rp]));

  // ── Agrupación por mes (según la fecha del SERVICIO, no del pago) ──────
  const porMes = new Map<string, MesData>();
  function mesDe(key: string): MesData {
    if (!porMes.has(key)) {
      porMes.set(key, { total: 0, pasajes: 0, servicios: 0, rutas: [], movimientos: [] });
    }
    return porMes.get(key)!;
  }

  const serviciosPorMes = new Map<string, Set<string>>();
  const rutaMontoPorMes = new Map<string, Map<string, number>>();

  rps.forEach((rp) => {
    const servicioId = servicioPorAsiento.get(rp.asiento_id);
    const servicio = servicioId ? servicioPorId.get(servicioId) : undefined;
    if (!servicio) return;
    const key = mesKey(servicio.fecha);
    const m = mesDe(key);
    m.pasajes += 1;

    if (!serviciosPorMes.has(key)) serviciosPorMes.set(key, new Set());
    serviciosPorMes.get(key)!.add(servicio.id);

    if (!rutaMontoPorMes.has(key)) rutaMontoPorMes.set(key, new Map());
    const rutaMap = rutaMontoPorMes.get(key)!;
    rutaMap.set(servicio.destino, (rutaMap.get(servicio.destino) ?? 0) + Number(rp.precio));
  });

  (pagosData ?? []).forEach((p) => {
    const rp = rpPorId.get(p.reserva_pasajero_id);
    if (!rp) return;
    const servicioId = servicioPorAsiento.get(rp.asiento_id);
    const servicio = servicioId ? servicioPorId.get(servicioId) : undefined;
    if (!servicio) return;
    const key = mesKey(servicio.fecha);
    const m = mesDe(key);
    m.total += Number(p.monto);

    const cliente = clientePorId.get(rp.cliente_id);
    const mov: Movimiento = {
      fecha: fechaDDMMYYYY(p.fecha),
      fechaOrden: p.fecha,
      pasajero: cliente ? `${cliente.apellido}, ${cliente.nombre}` : "—",
      servicio: `${servicio.origen} → ${servicio.destino}`,
      monto: Number(p.monto),
      medio: p.medio_pago === "efectivo" ? "Efectivo" : p.medio_pago === "transferencia" ? "Transferencia" : "Tarjeta",
    };
    m.movimientos.push(mov);
  });

  for (const [key, m] of porMes) {
    m.servicios = serviciosPorMes.get(key)?.size ?? 0;
    const rutaMap = rutaMontoPorMes.get(key) ?? new Map();
    const maxRuta = Math.max(1, ...rutaMap.values());
    m.rutas = [...rutaMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, monto]) => ({ nombre, monto, pct: Math.max(Math.round((monto / maxRuta) * 100), 4) }));
    m.movimientos.sort((a, b) => (a.fechaOrden < b.fechaOrden ? 1 : -1));
  }

  const mesesKeys = [...porMes.keys()].sort((a, b) => (a < b ? 1 : -1));
  const porMesObj: Record<string, MesData> = {};
  const mesesOptions = mesesKeys.map((k) => {
    porMesObj[k] = porMes.get(k)!;
    return { value: k, label: mesLabel(k) };
  });

  const serviciosOptions: ServicioOption[] = servicios.map((s) => ({
    id: s.id,
    label: `${s.origen} → ${s.destino} · ${fechaCorta(s.fecha)}`,
    destino: s.destino,
    fecha: s.fecha,
  }));

  return <ReportesClient porMes={porMesObj} mesesOptions={mesesOptions} serviciosOptions={serviciosOptions} />;
}
