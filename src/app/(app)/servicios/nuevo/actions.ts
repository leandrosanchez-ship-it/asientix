"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import { SUPERIOR_IDS, INFERIOR_IDS } from "@/lib/mock-data";
import { parseArsMoney, capitalizarPalabras } from "@/lib/format";
import type { Moneda, TipoHabitacion } from "@/lib/types";

export interface CrearServicioInput {
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  tipoCoche: string;
  unidad: string;
  precioPasaje: string;
  moneda: Moneda;
  incluyeHotel: boolean;
  hotelId: string;
  tiposHabitacionDisponibles: TipoHabitacion[];
  cantidadHabitaciones: string;
  incluyeAsistencia: boolean;
  asistenciaId: string;
  incluyeExcursion: boolean;
  excursionObservaciones: string;
  coordinadorId: string;
  transporteId: string;
  observacionesIds: string[];
}

export async function crearServicio(input: CrearServicioInput) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");
  if (!input.destino.trim() || !input.fecha) {
    throw new Error("Destino y fecha son obligatorios");
  }
  // Opcional: si no se define acá, el precio se carga al vender cada
  // asiento (útil cuando todavía no está cerrado al armar la salida).
  const precioTexto = input.precioPasaje.trim();
  const precioPasaje = precioTexto ? parseArsMoney(precioTexto) : null;
  if (precioPasaje !== null && precioPasaje <= 0) {
    throw new Error("El precio del pasaje tiene que ser mayor a 0");
  }

  const supabase = await createClient();

  const { data: servicio, error } = await supabase
    .from("servicios")
    .insert({
      agencia_id: usuario.agenciaId,
      origen: capitalizarPalabras(input.origen),
      destino: capitalizarPalabras(input.destino),
      fecha: input.fecha,
      hora: input.hora || "00:00",
      tipo_coche: input.tipoCoche,
      unidad: input.unidad.trim() || null,
      precio_pasaje: precioPasaje,
      moneda: input.moneda,
      incluye_hotel: input.incluyeHotel,
      hotel_id: input.incluyeHotel && input.hotelId ? input.hotelId : null,
      tipos_habitacion_disponibles: input.incluyeHotel ? input.tiposHabitacionDisponibles : [],
      cantidad_habitaciones: input.incluyeHotel && input.cantidadHabitaciones.trim() ? Number(input.cantidadHabitaciones) : null,
      incluye_asistencia: input.incluyeAsistencia,
      asistencia_id: input.incluyeAsistencia && input.asistenciaId ? input.asistenciaId : null,
      incluye_excursion: input.incluyeExcursion,
      excursion_observaciones: input.incluyeExcursion ? input.excursionObservaciones.trim() : "",
      coordinador_id: input.coordinadorId || null,
      transporte_id: input.transporteId || null,
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
