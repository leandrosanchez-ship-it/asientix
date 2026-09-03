import { createClient } from "@/lib/supabase/server";
import { ClientesClient } from "./ClientesClient";
import type { ClienteConViajes } from "./ClientesClient";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, nombre, apellido, dni, telefono")
    .order("apellido", { ascending: true });

  const clientes = clientesData ?? [];
  const clienteIds = clientes.map((c) => c.id);

  const { data: rpData } =
    clienteIds.length > 0
      ? await supabase.from("reserva_pasajeros").select("cliente_id, reserva_id").in("cliente_id", clienteIds)
      : { data: [] };

  const reservaIds = [...new Set((rpData ?? []).map((rp) => rp.reserva_id))];
  const { data: reservasData } =
    reservaIds.length > 0
      ? await supabase.from("reservas").select("id, servicio_id").in("id", reservaIds)
      : { data: [] };

  const servicioIdPorReserva = new Map((reservasData ?? []).map((r) => [r.id, r.servicio_id]));
  const servicioIds = [...new Set((reservasData ?? []).map((r) => r.servicio_id))];

  const { data: serviciosData } =
    servicioIds.length > 0
      ? await supabase.from("servicios").select("id, fecha").in("id", servicioIds)
      : { data: [] };

  const fechaPorServicio = new Map((serviciosData ?? []).map((s) => [s.id, s.fecha as string]));

  // Por cliente: cantidad de viajes (reservas distintas) + fecha del último.
  const viajesPorCliente = new Map<string, { cantidad: number; ultimaFecha: string | null }>();
  (rpData ?? []).forEach((rp) => {
    const servicioId = servicioIdPorReserva.get(rp.reserva_id);
    const fecha = servicioId ? (fechaPorServicio.get(servicioId) ?? null) : null;
    const prev = viajesPorCliente.get(rp.cliente_id) ?? { cantidad: 0, ultimaFecha: null };
    viajesPorCliente.set(rp.cliente_id, {
      cantidad: prev.cantidad + 1,
      ultimaFecha: !prev.ultimaFecha || (fecha && fecha > prev.ultimaFecha) ? (fecha ?? prev.ultimaFecha) : prev.ultimaFecha,
    });
  });

  const clientesConViajes: ClienteConViajes[] = clientes.map((c) => {
    const v = viajesPorCliente.get(c.id);
    return {
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      dni: c.dni ?? "",
      telefono: c.telefono ?? "",
      viajes: v?.cantidad ?? 0,
      ultimoViaje: v?.ultimaFecha ?? null,
    };
  });

  return <ClientesClient clientes={clientesConViajes} />;
}
