import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { CajaClient, type Movimiento, type Cierre } from "./CajaClient";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function CajaPage() {
  await requirePantalla("caja");
  const supabase = await createClient();

  const hoy = new Date();
  const hoyIso = isoLocal(hoy);
  const fechaHoy = `${DIAS[hoy.getDay()]} ${hoy.getDate()} ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;

  // Rango de "hoy" en UTC no sirve acá — pagos.fecha es timestamptz, así que
  // filtramos por el día calendario local con un rango [00:00, 24:00).
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 0, 0, 0).toISOString();

  const { data: pagosData } = await supabase
    .from("pagos")
    .select("id, reserva_pasajero_id, monto, medio_pago, fecha")
    .gte("fecha", inicio)
    .lt("fecha", fin)
    .order("fecha", { ascending: true });

  const pagos = pagosData ?? [];
  const rpIds = [...new Set(pagos.map((p) => p.reserva_pasajero_id))];
  const { data: rpData } =
    rpIds.length > 0
      ? await supabase.from("reserva_pasajeros").select("id, reserva_id, cliente_id, es_responsable").in("id", rpIds)
      : { data: [] };
  const rpPorId = new Map((rpData ?? []).map((rp) => [rp.id, rp]));
  const clienteIds = [...new Set((rpData ?? []).map((rp) => rp.cliente_id))];
  const { data: clientesData } =
    clienteIds.length > 0
      ? await supabase.from("clientes").select("id, nombre, apellido").in("id", clienteIds)
      : { data: [] };
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));

  // Un cobro real (al reservar, al saldar un grupo, un pago parcial en
  // Cobros) inserta un pago por cada pasajero que abarca, todos con el
  // mismo instante exacto (el insert en bloque comparte el mismo now()) —
  // se agrupan por reserva + instante + medio para que se vean como la
  // operación única que fueron, no como pagos repetidos por casualidad.
  interface Grupo {
    fecha: string;
    medio: string;
    monto: number;
    rpIds: Set<string>;
  }
  const grupos = new Map<string, Grupo>();
  pagos.forEach((p) => {
    const rp = rpPorId.get(p.reserva_pasajero_id);
    if (!rp) return;
    const key = `${rp.reserva_id}__${p.fecha}__${p.medio_pago}`;
    const g = grupos.get(key) ?? { fecha: p.fecha, medio: p.medio_pago, monto: 0, rpIds: new Set<string>() };
    g.monto += Number(p.monto);
    g.rpIds.add(p.reserva_pasajero_id);
    grupos.set(key, g);
  });

  const movimientos: (Movimiento & { fechaOrden: string })[] = [...grupos.values()].map((g) => {
    const rpsDelGrupo = [...g.rpIds].map((id) => rpPorId.get(id)!);
    const responsable = rpsDelGrupo.find((rp) => rp.es_responsable) ?? rpsDelGrupo[0];
    const cliente = clientePorId.get(responsable.cliente_id);
    const nombreBase = cliente ? `${cliente.apellido}, ${cliente.nombre}` : "—";
    const d = new Date(g.fecha);
    return {
      hora: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      pasajero: rpsDelGrupo.length > 1 ? `${nombreBase} +${rpsDelGrupo.length - 1}` : nombreBase,
      medio: g.medio === "efectivo" ? "Efectivo" : g.medio === "transferencia" ? "Transferencia" : "Tarjeta",
      monto: g.monto,
      fechaOrden: g.fecha,
    };
  });
  movimientos.sort((a, b) => (a.fechaOrden < b.fechaOrden ? -1 : 1));

  const total = movimientos.reduce((s, m) => s + m.monto, 0);
  const porMedio = (medio: string) => movimientos.filter((m) => m.medio === medio).reduce((s, m) => s + m.monto, 0);
  const efectivo = porMedio("Efectivo");
  const transferencia = porMedio("Transferencia");
  const tarjeta = porMedio("Tarjeta");

  const { data: cierreData } = await supabase
    .from("cierres_caja")
    .select("efectivo_esperado, efectivo_contado, diferencia")
    .eq("fecha", hoyIso)
    .maybeSingle();

  const cierre: Cierre | null = cierreData
    ? {
        efectivoEsperado: Number(cierreData.efectivo_esperado),
        efectivoContado: Number(cierreData.efectivo_contado),
        diferencia: Number(cierreData.diferencia),
      }
    : null;

  return (
    <CajaClient
      fechaHoy={fechaHoy}
      total={total}
      efectivo={efectivo}
      transferencia={transferencia}
      tarjeta={tarjeta}
      movimientos={movimientos}
      cierre={cierre}
    />
  );
}
