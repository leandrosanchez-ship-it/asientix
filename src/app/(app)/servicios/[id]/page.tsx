import { notFound } from "next/navigation";
import {
  SERVICIOS,
  HOTELES,
  ASISTENCIAS,
  OBSERVACIONES,
  generarAsientosDemo,
} from "@/lib/mock-data";
import { MapaAsientosClient } from "./MapaAsientosClient";

// TODO: reemplazar SERVICIOS.find(...) + generarAsientosDemo(...) por
// consultas reales a Supabase (servicios, asientos, reserva_pasajeros join
// clientes, hoteles, asistencias_viajero, observaciones) una vez conectado.

export default async function ServicioPage({ params }: PageProps<"/servicios/[id]">) {
  const { id } = await params;
  const servicio = SERVICIOS.find((s) => s.id === id);
  if (!servicio) notFound();

  const { asientos, clientes, reservas, reservaPasajeros } = generarAsientosDemo(servicio.id);
  const hotel = HOTELES.find((h) => h.id === servicio.hotelId) ?? null;
  const asistencia = ASISTENCIAS.find((a) => a.id === servicio.asistenciaId) ?? null;
  const observaciones = OBSERVACIONES.filter((o) => servicio.observacionesIds.includes(o.id));

  return (
    <MapaAsientosClient
      servicio={servicio}
      asientosIniciales={asientos}
      clientesIniciales={clientes}
      reservasIniciales={reservas}
      reservaPasajerosIniciales={reservaPasajeros}
      hotel={hotel}
      asistencia={asistencia}
      observaciones={observaciones}
    />
  );
}
