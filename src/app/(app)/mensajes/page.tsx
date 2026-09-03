import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { MensajesClient, type Recipient, type Plantillas } from "./MensajesClient";

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function edadDe(nacimiento: string | null): number | null {
  if (!nacimiento) return null;
  const hoy = new Date();
  const nac = new Date(`${nacimiento}T00:00:00`);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export default async function MensajesPage() {
  const usuario = await requirePantalla("mensajes");
  const supabase = await createClient();

  const { data: agenciaData } = usuario?.agenciaId
    ? await supabase.from("agencias").select("nombre").eq("id", usuario.agenciaId).single()
    : { data: null };
  const nombreAgencia = agenciaData?.nombre ?? "tu agencia";

  const defaults: Plantillas = {
    saldo: `Hola {nombre}! Te escribimos de ${nombreAgencia} para recordarte que tenés un saldo pendiente de \${saldo} por tu pasaje a {destino} del {fecha}. Cualquier consulta, quedamos a disposición. ¡Gracias!`,
    viaje: `Hola {nombre}! Te recordamos que tenés viaje con ${nombreAgencia} el {fecha} a las {hora} hs. Salida desde {lugar}. Tu asiento es el {asiento}. No te olvides de traer tu DNI. ¡Buen viaje!`,
    cumple: `¡Feliz cumpleaños, {nombre}! 🎉 Todo el equipo de ${nombreAgencia} te desea un gran día. Como regalo, tenés 10% de descuento en tu próximo viaje durante este mes.`,
    promo: `Hola {nombre}! Tenemos una promo especial para vos: pasajes con 15% off por tiempo limitado. ¿Te interesa que te reserve un lugar?`,
  };

  const { data: plantillasData } = await supabase.from("mensajes_plantillas").select("tipo, texto");
  const plantillas: Plantillas = { ...defaults };
  (plantillasData ?? []).forEach((p) => {
    if (p.tipo in plantillas) plantillas[p.tipo as keyof Plantillas] = p.texto;
  });

  // ── Saldo pendiente: mismo join que Cobros ──────────────────────────
  const { data: rpData } = await supabase
    .from("reserva_pasajeros")
    .select("id, asiento_id, cliente_id, precio")
    .eq("estado", "activo");
  const rps = rpData ?? [];
  const rpIds = rps.map((rp) => rp.id);
  const asientoIds = [...new Set(rps.map((rp) => rp.asiento_id))];
  const clienteIdsRp = [...new Set(rps.map((rp) => rp.cliente_id))];

  const [{ data: pagosData }, { data: clientesRpData }, { data: asientosData }] = await Promise.all([
    rpIds.length > 0
      ? supabase.from("pagos").select("reserva_pasajero_id, monto").in("reserva_pasajero_id", rpIds)
      : Promise.resolve({ data: [] }),
    clienteIdsRp.length > 0
      ? supabase.from("clientes").select("id, nombre, apellido, telefono").in("id", clienteIdsRp)
      : Promise.resolve({ data: [] }),
    asientoIds.length > 0
      ? supabase.from("asientos").select("id, numero, servicio_id").in("id", asientoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const servicioIdsDeAsientos = [...new Set((asientosData ?? []).map((a) => a.servicio_id))];
  const { data: serviciosDeAsientos } =
    servicioIdsDeAsientos.length > 0
      ? await supabase.from("servicios").select("id, origen, destino, fecha, hora").in("id", servicioIdsDeAsientos)
      : { data: [] };

  const pagadoPorRp = new Map<string, number>();
  (pagosData ?? []).forEach((p) => {
    pagadoPorRp.set(p.reserva_pasajero_id, (pagadoPorRp.get(p.reserva_pasajero_id) ?? 0) + Number(p.monto));
  });
  const clientePorId = new Map((clientesRpData ?? []).map((c) => [c.id, c]));
  const asientoPorId = new Map((asientosData ?? []).map((a) => [a.id, a]));
  const servicioPorId = new Map((serviciosDeAsientos ?? []).map((s) => [s.id, s]));

  const saldoRecipients: Recipient[] = rps
    .map((rp): Recipient | null => {
      const cliente = clientePorId.get(rp.cliente_id);
      const asiento = asientoPorId.get(rp.asiento_id);
      const servicio = asiento ? servicioPorId.get(asiento.servicio_id) : undefined;
      const total = Number(rp.precio);
      const pagado = pagadoPorRp.get(rp.id) ?? 0;
      const saldo = Math.max(total - pagado, 0);
      if (!cliente || !cliente.telefono || saldo <= 0 || !servicio) return null;
      return {
        display: `${cliente.apellido}, ${cliente.nombre}`,
        telefono: cliente.telefono,
        extra: null,
        data: {
          nombre: cliente.nombre,
          saldo: Math.round(saldo).toLocaleString("es-AR"),
          destino: servicio.destino,
          fecha: servicio.fecha.split("-").reverse().join("/"),
        },
      };
    })
    .filter((r): r is Recipient => r !== null);

  // ── Recordatorio de viaje: servicios de mañana ──────────────────────
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const mananaIso = isoLocal(manana);

  const { data: serviciosManana } = await supabase
    .from("servicios")
    .select("id, origen, fecha, hora")
    .eq("fecha", mananaIso);
  const servicioMananaIds = (serviciosManana ?? []).map((s) => s.id);
  const servicioMananaPorId = new Map((serviciosManana ?? []).map((s) => [s.id, s]));

  const { data: asientosManana } =
    servicioMananaIds.length > 0
      ? await supabase.from("asientos").select("id, numero, servicio_id").in("servicio_id", servicioMananaIds)
      : { data: [] };
  const asientoMananaIds = (asientosManana ?? []).map((a) => a.id);
  const asientoMananaPorId = new Map((asientosManana ?? []).map((a) => [a.id, a]));

  const { data: rpManana } =
    asientoMananaIds.length > 0
      ? await supabase
          .from("reserva_pasajeros")
          .select("asiento_id, cliente_id")
          .eq("estado", "activo")
          .in("asiento_id", asientoMananaIds)
      : { data: [] };
  const clienteMananaIds = [...new Set((rpManana ?? []).map((rp) => rp.cliente_id))];
  const { data: clientesManana } =
    clienteMananaIds.length > 0
      ? await supabase.from("clientes").select("id, nombre, apellido, telefono").in("id", clienteMananaIds)
      : { data: [] };
  const clienteMananaPorId = new Map((clientesManana ?? []).map((c) => [c.id, c]));

  const viajeRecipients: Recipient[] = (rpManana ?? [])
    .map((rp): Recipient | null => {
      const cliente = clienteMananaPorId.get(rp.cliente_id);
      const asiento = asientoMananaPorId.get(rp.asiento_id);
      const servicio = asiento ? servicioMananaPorId.get(asiento.servicio_id) : undefined;
      if (!cliente || !cliente.telefono || !asiento || !servicio) return null;
      return {
        display: `${cliente.apellido}, ${cliente.nombre}`,
        telefono: cliente.telefono,
        extra: null,
        data: {
          nombre: cliente.nombre,
          fecha: servicio.fecha.split("-").reverse().join("/"),
          hora: (servicio.hora ?? "").slice(0, 5),
          lugar: `Terminal de Ómnibus, ${servicio.origen}`,
          asiento: asiento.numero,
        },
      };
    })
    .filter((r): r is Recipient => r !== null);

  // ── Cumpleaños / Promociones: base de clientes con edad ─────────────
  const { data: todosClientes } = await supabase
    .from("clientes")
    .select("nombre, apellido, telefono, email, nacimiento");
  const clientesConEdad = (todosClientes ?? [])
    .filter((c) => !!c.telefono)
    .map((c) => ({
      display: `${c.apellido}, ${c.nombre}`,
      telefono: c.telefono as string,
      email: c.email || null,
      edad: edadDe(c.nacimiento),
      data: { nombre: c.nombre },
    }));

  return (
    <MensajesClient
      plantillas={plantillas}
      saldoRecipients={saldoRecipients}
      viajeRecipients={viajeRecipients}
      clientesConEdad={clientesConEdad}
    />
  );
}
