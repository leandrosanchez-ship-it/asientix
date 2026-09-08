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

  const salidas: SalidaRow[] = await Promise.all(
    servicios.map(async (s) => {
      const [{ count: total }, { count: vendidos }] = await Promise.all([
        supabase.from("asientos").select("*", { count: "exact", head: true }).eq("servicio_id", s.id),
        supabase
          .from("asientos")
          .select("*", { count: "exact", head: true })
          .eq("servicio_id", s.id)
          .neq("estado", "libre"),
      ]);
      return {
        id: s.id,
        origen: s.origen,
        destino: s.destino,
        fechaLabel: formatFecha(s.fecha),
        hora: s.hora?.slice(0, 5) ?? "",
        tipoCoche: s.tipo_coche,
        vendidos: vendidos ?? 0,
        total: total ?? 0,
        puedeEliminar,
      };
    }),
  );

  return <SalidasClient salidasIniciales={salidas} />;
}
