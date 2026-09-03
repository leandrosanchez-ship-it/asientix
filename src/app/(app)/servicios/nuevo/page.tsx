import { HOTELES, ASISTENCIAS, OBSERVACIONES } from "@/lib/mock-data";
import { NuevoServicioClient } from "./NuevoServicioClient";

// TODO: reemplazar por selects reales de hoteles/asistencias_viajero/observaciones
// (filtrados por agencia_id) y un insert real en `servicios` al guardar, una vez
// conectado Supabase.

export default function NuevoServicioPage() {
  return (
    <NuevoServicioClient hoteles={HOTELES} asistencias={ASISTENCIAS} observaciones={OBSERVACIONES} />
  );
}
