import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { CobrosClient, type FilaCobro } from "./CobrosClient";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatFechaCorta(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export default async function CobrosPage() {
  await requirePantalla("cobros");
  const supabase = await createClient();

  const { data: rpData } = await supabase
    .from("reserva_pasajeros")
    .select("id, reserva_id, asiento_id, cliente_id, precio, es_responsable, reservas(servicio_id)")
    .eq("estado", "activo");

  const rps = rpData ?? [];
  const rpIds = rps.map((rp) => rp.id);
  const clienteIds = [...new Set(rps.map((rp) => rp.cliente_id))];
  const asientoIds = [...new Set(rps.map((rp) => rp.asiento_id))];
  const servicioIds = [
    ...new Set(
      rps
        .map((rp) => (rp.reservas as unknown as { servicio_id: string } | null)?.servicio_id)
        .filter((x): x is string => !!x),
    ),
  ];

  const [{ data: pagosData }, { data: clientesData }, { data: asientosData }, { data: serviciosData }] =
    await Promise.all([
      rpIds.length > 0
        ? supabase.from("pagos").select("reserva_pasajero_id, monto").in("reserva_pasajero_id", rpIds)
        : Promise.resolve({ data: [] }),
      clienteIds.length > 0
        ? supabase.from("clientes").select("id, nombre, apellido, telefono").in("id", clienteIds)
        : Promise.resolve({ data: [] }),
      asientoIds.length > 0
        ? supabase.from("asientos").select("id, numero, servicio_id").in("id", asientoIds)
        : Promise.resolve({ data: [] }),
      servicioIds.length > 0
        ? supabase.from("servicios").select("id, origen, destino, fecha").in("id", servicioIds)
        : Promise.resolve({ data: [] }),
    ]);

  const pagadoPorRp = new Map<string, number>();
  (pagosData ?? []).forEach((p) => {
    pagadoPorRp.set(p.reserva_pasajero_id, (pagadoPorRp.get(p.reserva_pasajero_id) ?? 0) + Number(p.monto));
  });
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));
  const asientoPorId = new Map((asientosData ?? []).map((a) => [a.id, a]));
  const servicioPorId = new Map((serviciosData ?? []).map((s) => [s.id, s]));

  // La deuda es de la reserva completa, no de un pasajero suelto — se
  // agrupan todos los reserva_pasajeros de una misma reserva en una sola
  // fila, con el total/pagado/saldo sumados entre todos.
  const porReserva = new Map<string, typeof rps>();
  rps.forEach((rp) => {
    const arr = porReserva.get(rp.reserva_id) ?? [];
    arr.push(rp);
    porReserva.set(rp.reserva_id, arr);
  });

  const filas: FilaCobro[] = [];
  for (const [reservaId, grupo] of porReserva) {
    const total = grupo.reduce((s, rp) => s + Number(rp.precio), 0);
    const pagado = grupo.reduce((s, rp) => s + (pagadoPorRp.get(rp.id) ?? 0), 0);
    const saldo = Math.max(total - pagado, 0);
    if (saldo <= 0) continue;

    const responsable = grupo.find((rp) => rp.es_responsable) ?? grupo[0];
    const clienteResp = clientePorId.get(responsable.cliente_id);
    const asientos = grupo
      .map((rp) => asientoPorId.get(rp.asiento_id)?.numero)
      .filter((n): n is number => n !== undefined)
      .sort((a, b) => a - b);
    const primerAsiento = asientoPorId.get(grupo[0].asiento_id);
    const servicio = primerAsiento ? servicioPorId.get(primerAsiento.servicio_id) : undefined;

    const nombreBase = clienteResp ? `${clienteResp.apellido}, ${clienteResp.nombre}` : "—";

    filas.push({
      id: reservaId,
      reservaPasajeroId: responsable.id,
      pasajero: grupo.length > 1 ? `${nombreBase} +${grupo.length - 1}` : nombreBase,
      cantidadPasajeros: grupo.length,
      nombre: clienteResp?.nombre ?? "",
      telefono: clienteResp?.telefono ?? "",
      servicio: servicio ? `${servicio.origen} → ${servicio.destino} · ${formatFechaCorta(servicio.fecha)}` : "—",
      asientos,
      total,
      pagado,
      saldo,
    });
  }

  filas.sort((a, b) => b.saldo - a.saldo);

  return <CobrosClient filasIniciales={filas} />;
}
