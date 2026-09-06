import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { TareasClient, type Tarea, type WeekDay } from "./TareasClient";

const LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOf(d: Date) {
  const offset = (d.getDay() + 6) % 7; // lunes = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export default async function TareasPage({ searchParams }: PageProps<"/tareas">) {
  await requirePantalla("tareas");
  const supabase = await createClient();

  const today = new Date();
  const hoyIso = isoLocal(today);

  // ?semana=YYYY-MM-DD (cualquier fecha de esa semana) navega a semanas
  // futuras o pasadas sin perder la semana actual como default.
  const semanaParam = (await searchParams).semana;
  const semanaRaw = Array.isArray(semanaParam) ? semanaParam[0] : semanaParam;
  const fechaBase = semanaRaw && /^\d{4}-\d{2}-\d{2}$/.test(semanaRaw) ? new Date(`${semanaRaw}T00:00:00`) : today;

  const monday = mondayOf(fechaBase);
  const sunday = addDays(monday, 6);
  const mondayIso = isoLocal(monday);
  const esSemanaActual = mondayIso === isoLocal(mondayOf(today));

  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return {
      fecha: isoLocal(d),
      label: LABELS[i],
      num: d.getDate(),
      isToday: isoLocal(d) === hoyIso,
    };
  });

  const rangoLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()} al ${sunday.getDate()} de ${MESES[monday.getMonth()]}`
      : `${monday.getDate()} de ${MESES[monday.getMonth()]} al ${sunday.getDate()} de ${MESES[sunday.getMonth()]}`;

  const { data: tareasData } = await supabase
    .from("tareas")
    .select("id, titulo, fecha, estado")
    .gte("fecha", mondayIso)
    .lte("fecha", isoLocal(sunday))
    .order("fecha", { ascending: true });

  const tareas: Tarea[] = (tareasData ?? []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fecha: t.fecha,
    estado: t.estado,
  }));

  return (
    <TareasClient
      // key: fuerza un remount completo al cambiar de semana — sin esto,
      // React reutiliza la instancia y el useState(tareasIniciales) local
      // se queda con los datos de la semana vieja (las props nuevas no
      // resetean un useState ya inicializado).
      key={mondayIso}
      week={week}
      tareasIniciales={tareas}
      hoyIso={hoyIso}
      rangoLabel={rangoLabel}
      esSemanaActual={esSemanaActual}
      semanaAnteriorIso={isoLocal(addDays(monday, -7))}
      semanaSiguienteIso={isoLocal(addDays(monday, 7))}
    />
  );
}
