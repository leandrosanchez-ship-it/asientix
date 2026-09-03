import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { CancelacionClient, type EventoHistorial, type ServicioOption } from "./CancelacionClient";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fechaCorta(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tituloEvento(accion: string, motivo: string | null, detalle: Record<string, unknown> | null): string {
  if (accion === "creada") {
    const pasajeros = (detalle?.pasajeros as string[] | undefined) ?? [];
    return pasajeros.length > 0 ? `Reserva creada — ${pasajeros.join(", ")}` : "Reserva creada";
  }
  if (accion === "pago_registrado") {
    const monto = detalle?.monto as number | undefined;
    return monto ? `Pago registrado — $${Math.round(monto).toLocaleString("es-AR")}` : "Pago registrado";
  }
  if (accion === "cancelada") {
    const asiento = detalle?.asiento as number | undefined;
    const base = asiento ? `Asiento ${asiento} cancelado` : "Cancelada";
    return motivo ? `${base} — motivo: ${motivo}` : base;
  }
  if (accion === "reprogramada") {
    const destino = detalle?.destino as string | undefined;
    const fecha = detalle?.fecha as string | undefined;
    return destino && fecha ? `Reprogramada a ${destino} · ${fechaCorta(fecha)}` : "Reprogramada";
  }
  return accion;
}

export default async function CancelacionPage({
  params,
}: {
  params: Promise<{ id: string; rpId: string }>;
}) {
  await requirePantalla("salidas");
  const { id: servicioId, rpId } = await params;
  const supabase = await createClient();

  const { data: rp } = await supabase
    .from("reserva_pasajeros")
    .select("id, reserva_id, asiento_id, cliente_id, precio, estado")
    .eq("id", rpId)
    .single();
  if (!rp) notFound();

  const [{ data: cliente }, { data: asiento }, { data: reserva }, { data: pagos }] = await Promise.all([
    supabase.from("clientes").select("nombre, apellido").eq("id", rp.cliente_id).single(),
    supabase.from("asientos").select("numero, servicio_id").eq("id", rp.asiento_id).single(),
    supabase.from("reservas").select("id, codigo_validacion").eq("id", rp.reserva_id).single(),
    supabase.from("pagos").select("monto").eq("reserva_pasajero_id", rpId),
  ]);
  if (!cliente || !asiento) notFound();

  const { data: servicio } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha, hora")
    .eq("id", asiento.servicio_id)
    .single();
  if (!servicio) notFound();

  const totalPagado = (pagos ?? []).reduce((s, p) => s + Number(p.monto), 0);

  const hoyIso = isoLocal(new Date());
  const { data: proximasData } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha, hora")
    .neq("id", servicioId)
    .gte("fecha", hoyIso)
    .order("fecha", { ascending: true })
    .limit(30);

  const proximasSalidas: ServicioOption[] = (proximasData ?? []).map((s) => ({
    id: s.id,
    label: `${fechaCorta(s.fecha)} · ${(s.hora ?? "").slice(0, 5)} hs · ${s.origen} → ${s.destino}`,
  }));

  const { data: eventosData } = await supabase
    .from("eventos_reserva")
    .select("id, accion, motivo, detalle, created_at")
    .eq("reserva_id", rp.reserva_id)
    .order("created_at", { ascending: true });

  const historial: EventoHistorial[] = (eventosData ?? []).map((e) => ({
    titulo: tituloEvento(e.accion, e.motivo, e.detalle as Record<string, unknown> | null),
    fecha: new Date(e.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
  }));

  return (
    <CancelacionClient
      servicioId={servicioId}
      rpId={rpId}
      numero={asiento.numero}
      clienteNombre={`${cliente.apellido}, ${cliente.nombre}`}
      servicioLabel={`${servicio.origen} → ${servicio.destino} · ${fechaCorta(servicio.fecha)}`}
      estadoInicial={rp.estado}
      saldoPagado={totalPagado}
      proximasSalidas={proximasSalidas}
      historialInicial={historial}
    />
  );
}
