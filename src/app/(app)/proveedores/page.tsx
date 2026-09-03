import { HOTELES, ASISTENCIAS, OBSERVACIONES } from "@/lib/mock-data";
import { ProveedoresClient } from "./ProveedoresClient";

// TODO: reemplazar por selects a `hoteles`/`asistencias_viajero`/`observaciones`
// filtrados por agencia_id (RLS ya se encarga del aislamiento) una vez conectado
// Supabase.

export default function ProveedoresPage() {
  return (
    <ProveedoresClient
      hotelesIniciales={HOTELES}
      asistenciasIniciales={ASISTENCIAS}
      observacionesIniciales={OBSERVACIONES}
    />
  );
}
