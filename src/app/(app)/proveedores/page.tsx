import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { ProveedoresClient } from "./ProveedoresClient";
import type { AsistenciaViajero, Coordinador, Hotel, Observacion, Transporte, Moneda } from "@/lib/types";

export default async function ProveedoresPage() {
  await requirePantalla("proveedores");
  const supabase = await createClient();

  const [
    { data: hotelesData },
    { data: asistenciasData },
    { data: coordinadoresData },
    { data: transportesData },
    { data: observacionesData },
  ] = await Promise.all([
    supabase.from("hoteles").select("id, agencia_id, nombre, contacto, telefono, direccion").order("nombre"),
    supabase
      .from("asistencias_viajero")
      .select("id, agencia_id, nombre, contacto, telefono, tope_cobertura_moneda, tope_cobertura_monto")
      .order("nombre"),
    supabase.from("coordinadores").select("id, agencia_id, nombre, apellido, telefono").order("apellido"),
    supabase.from("transportes").select("id, agencia_id, nombre, contacto").order("nombre"),
    supabase.from("observaciones").select("id, agencia_id, titulo, texto").order("titulo"),
  ]);

  const hoteles: Hotel[] = (hotelesData ?? []).map((h) => ({
    id: h.id,
    agenciaId: h.agencia_id,
    nombre: h.nombre,
    contacto: h.contacto ?? "",
    telefono: h.telefono ?? "",
    direccion: h.direccion ?? "",
  }));

  const asistencias: AsistenciaViajero[] = (asistenciasData ?? []).map((a) => ({
    id: a.id,
    agenciaId: a.agencia_id,
    nombre: a.nombre,
    contacto: a.contacto ?? "",
    telefono: a.telefono ?? "",
    topeCoberturaMoneda: (a.tope_cobertura_moneda as Moneda | null) ?? null,
    topeCoberturaMonto: a.tope_cobertura_monto !== null ? Number(a.tope_cobertura_monto) : null,
  }));

  const coordinadores: Coordinador[] = (coordinadoresData ?? []).map((c) => ({
    id: c.id,
    agenciaId: c.agencia_id,
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono ?? "",
  }));

  const transportes: Transporte[] = (transportesData ?? []).map((t) => ({
    id: t.id,
    agenciaId: t.agencia_id,
    nombre: t.nombre,
    contacto: t.contacto ?? "",
  }));

  const observaciones: Observacion[] = (observacionesData ?? []).map((o) => ({
    id: o.id,
    agenciaId: o.agencia_id,
    titulo: o.titulo,
    texto: o.texto,
  }));

  return (
    <ProveedoresClient
      hotelesIniciales={hoteles}
      asistenciasIniciales={asistencias}
      coordinadoresIniciales={coordinadores}
      transportesIniciales={transportes}
      observacionesIniciales={observaciones}
    />
  );
}
