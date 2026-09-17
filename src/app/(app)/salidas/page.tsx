import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { SalidasClient, type SalidaRow } from "./SalidasClient";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatFecha(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function SalidasPage() {
  const usuario = await requirePantalla("salidas");
  const supabase = await createClient();

  const { data: serviciosData } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha, hora, tipo_coche")
    .order("fecha", { ascending: true });

  const servicios = serviciosData ?? [];
  const puedeEliminar = usuario.rol === "admin" || usuario.rol === "superadmin";
  const servicioIds = servicios.map((s) => s.id);

  // Antes esto hacía 2 consultas POR salida (2N viajes de ida y vuelta a la
  // base) — con Supabase en otra región, esa cantidad de round-trips
  // secuenciales-en-paralelo alcanza para sentirse "trabado" al entrar a la
  // pantalla. Una sola consulta trae TODOS los asientos de TODAS las
  // salidas visibles y el conteo se hace acá, en memoria.
  const { data: asientosData } =
    servicioIds.length > 0
      ? await supabase.from("asientos").select("servicio_id, estado").in("servicio_id", servicioIds)
      : { data: [] };

  const contadoresPorServicio = new Map<string, { total: number; vendidos: number }>();
  (asientosData ?? []).forEach((a) => {
    const c = contadoresPorServicio.get(a.servicio_id) ?? { total: 0, vendidos: 0 };
    c.total += 1;
    if (a.estado !== "libre") c.vendidos += 1;
    contadoresPorServicio.set(a.servicio_id, c);
  });

  const salidas: SalidaRow[] = servicios.map((s) => {
    const c = contadoresPorServicio.get(s.id) ?? { total: 0, vendidos: 0 };
    return {
      id: s.id,
      origen: s.origen,
      destino: s.destino,
      fechaLabel: formatFecha(s.fecha),
      hora: s.hora?.slice(0, 5) ?? "",
      tipoCoche: s.tipo_coche,
      vendidos: c.vendidos,
      total: c.total,
      puedeEliminar,
    };
  });

  return <SalidasClient salidasIniciales={salidas} />;
}
