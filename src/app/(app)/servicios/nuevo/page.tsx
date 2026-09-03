import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { NuevoServicioClient } from "./NuevoServicioClient";
import type { AsistenciaViajero, Hotel, Observacion } from "@/lib/types";

export default async function NuevoServicioPage() {
  await requirePantalla("salidas");
  const supabase = await createClient();

  const [{ data: hotelesData }, { data: asistenciasData }, { data: observacionesData }] =
    await Promise.all([
      supabase.from("hoteles").select("id, agencia_id, nombre, contacto, telefono").order("nombre"),
      supabase
        .from("asistencias_viajero")
        .select("id, agencia_id, nombre, contacto, telefono")
        .order("nombre"),
      supabase.from("observaciones").select("id, agencia_id, titulo, texto").order("titulo"),
    ]);

  const hoteles: Hotel[] = (hotelesData ?? []).map((h) => ({
    id: h.id,
    agenciaId: h.agencia_id,
    nombre: h.nombre,
    contacto: h.contacto ?? "",
    telefono: h.telefono ?? "",
  }));

  const asistencias: AsistenciaViajero[] = (asistenciasData ?? []).map((a) => ({
    id: a.id,
    agenciaId: a.agencia_id,
    nombre: a.nombre,
    contacto: a.contacto ?? "",
    telefono: a.telefono ?? "",
  }));

  const observaciones: Observacion[] = (observacionesData ?? []).map((o) => ({
    id: o.id,
    agenciaId: o.agencia_id,
    titulo: o.titulo,
    texto: o.texto,
  }));

  return <NuevoServicioClient hoteles={hoteles} asistencias={asistencias} observaciones={observaciones} />;
}
