import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { ReportesClient, type MesData, type ServicioOption } from "./ReportesClient";
import { obtenerDatosMes } from "./actions";

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

export default async function ReportesPage() {
  await requirePantalla("reportes");
  const supabase = await createClient();

  // Trae solo lo liviano de TODOS los servicios (para el selector de mes y
  // el de "Emitir PDF") — los datos pesados (pasajeros, pagos) se traen
  // bajo demanda por mes vía obtenerDatosMes(), no acá para todo el
  // historial de una — eso era lo que hacía lenta a esta pantalla a medida
  // que se acumulan meses de operación real.
  const { data: serviciosData } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha")
    .order("fecha", { ascending: false });
  const servicios = serviciosData ?? [];

  const mesesKeys = [...new Set(servicios.map((s) => mesKey(s.fecha)))].sort((a, b) => (a < b ? 1 : -1));
  const mesesOptions = mesesKeys.map((k) => ({ value: k, label: mesLabel(k) }));

  const serviciosOptions: ServicioOption[] = servicios.map((s) => ({
    id: s.id,
    label: `${s.origen} → ${s.destino} · ${fechaCorta(s.fecha)}`,
    destino: s.destino,
    fecha: s.fecha,
  }));

  const mesInicial = mesesKeys[0] ?? null;
  const datosMesInicial: MesData | null = mesInicial ? await obtenerDatosMes(mesInicial) : null;

  return (
    <ReportesClient
      mesInicial={mesInicial}
      datosMesInicial={datosMesInicial}
      mesesOptions={mesesOptions}
      serviciosOptions={serviciosOptions}
    />
  );
}
