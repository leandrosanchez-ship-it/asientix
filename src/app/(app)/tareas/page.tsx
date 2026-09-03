import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { TareasClient, type Tarea, type WeekDay } from "./TareasClient";

const LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function TareasPage() {
  await requirePantalla("tareas");
  const supabase = await createClient();

  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return {
      fecha: isoLocal(d),
      label: LABELS[i],
      num: d.getDate(),
      isToday: isoLocal(d) === isoLocal(today),
    };
  });

  const { data: tareasData } = await supabase
    .from("tareas")
    .select("id, titulo, fecha, estado")
    .gte("fecha", isoLocal(monday))
    .lte("fecha", isoLocal(sunday))
    .order("fecha", { ascending: true });

  const tareas: Tarea[] = (tareasData ?? []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fecha: t.fecha,
    estado: t.estado,
  }));

  return <TareasClient week={week} tareasIniciales={tareas} hoyIso={isoLocal(today)} />;
}
