import { createClient } from "@/lib/supabase/server";
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
      ? await supabase.from("reserva_pasajeros").select("id, cliente_id").in("id", rpIds)
      : { data: [] };
  const clienteIdPorRp = new Map((rpData ?? []).map((rp) => [rp.id, rp.cliente_id]));
  const clienteIds = [...new Set((rpData ?? []).map((rp) => rp.cliente_id))];
  const { data: clientesData } =
    clienteIds.length > 0
      ? await supabase.from("clientes").select("id, nombre, apellido").in("id", clienteIds)
      : { data: [] };
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));

  const movimientos: Movimiento[] = pagos.map((p) => {
    const clienteId = clienteIdPorRp.get(p.reserva_pasajero_id);
    const cliente = clienteId ? clientePorId.get(clienteId) : undefined;
    const d = new Date(p.fecha);
    return {
      hora: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      pasajero: cliente ? `${cliente.apellido}, ${cliente.nombre}` : "—",
      medio: p.medio_pago === "efectivo" ? "Efectivo" : p.medio_pago === "transferencia" ? "Transferencia" : "Tarjeta",
      monto: Number(p.monto),
    };
  });

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
