"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import { SUPERIOR_IDS, INFERIOR_IDS } from "@/lib/mock-data";
import type { TipoHabitacion } from "@/lib/types";

export interface CrearServicioInput {
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  tipoCoche: string;
  unidad: string;
  precioPasaje: string;
  incluyeHotel: boolean;
  hotelId: string;
  tiposHabitacionDisponibles: TipoHabitacion[];
  incluyeAsistencia: boolean;
  asistenciaId: string;
  observacionesIds: string[];
}

export async function crearServicio(input: CrearServicioInput) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");
  if (!input.destino.trim() || !input.fecha) {
    throw new Error("Destino y fecha son obligatorios");
  }

  const supabase = await createClient();

  const { data: servicio, error } = await supabase
    .from("servicios")
    .insert({
      agencia_id: usuario.agenciaId,
      origen: input.origen.trim(),
      destino: input.destino.trim(),
      fecha: input.fecha,
      hora: input.hora || "00:00",
      tipo_coche: input.tipoCoche,
      unidad: input.unidad.trim() || null,
      precio_pasaje: Number(input.precioPasaje.replace(/[^\d.]/g, "")) || 0,
      incluye_hotel: input.incluyeHotel,
      hotel_id: input.incluyeHotel && input.hotelId ? input.hotelId : null,
      tipos_habitacion_disponibles: input.incluyeHotel ? input.tiposHabitacionDisponibles : [],
      incluye_asistencia: input.incluyeAsistencia,
      asistencia_id: input.incluyeAsistencia && input.asistenciaId ? input.asistenciaId : null,
      observaciones_ids: input.observacionesIds,
    })
    .select("id")
    .single();
  if (error || !servicio) throw new Error(error?.message ?? "No se pudo crear el servicio");

  // Numeración real de doble piso — misma disposición física para todos los
  // servicios (ver SeatMap.tsx), no depende de la "cantidad de asientos" del form.
  const asientos = [
    ...SUPERIOR_IDS.map((numero) => ({ servicio_id: servicio.id, numero, piso: "superior", estado: "libre" })),
    ...INFERIOR_IDS.map((numero) => ({ servicio_id: servicio.id, numero, piso: "inferior", estado: "libre" })),
  ];
  const { error: asientosError } = await supabase.from("asientos").insert(asientos);
  if (asientosError) throw new Error(asientosError.message);

  revalidatePath("/salidas");
  return servicio.id as string;
}
