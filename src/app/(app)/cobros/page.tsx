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
    .select("id, asiento_id, cliente_id, precio, reserva_id, reservas(servicio_id)")
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

  const filas: FilaCobro[] = rps
    .map((rp) => {
      const cliente = clientePorId.get(rp.cliente_id);
      const asiento = asientoPorId.get(rp.asiento_id);
      const servicio = asiento ? servicioPorId.get(asiento.servicio_id) : undefined;
      const total = Number(rp.precio);
      const pagado = pagadoPorRp.get(rp.id) ?? 0;
      const saldo = Math.max(total - pagado, 0);
      return {
        id: rp.id,
        pasajero: cliente ? `${cliente.apellido}, ${cliente.nombre}` : "—",
        nombre: cliente?.nombre ?? "",
        telefono: cliente?.telefono ?? "",
        servicio: servicio ? `${servicio.origen} → ${servicio.destino} · ${formatFechaCorta(servicio.fecha)}` : "—",
        asiento: asiento?.numero ?? 0,
        total,
        pagado,
        saldo,
      };
    })
    .filter((f) => f.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);

  return <CobrosClient filasIniciales={filas} />;
}
