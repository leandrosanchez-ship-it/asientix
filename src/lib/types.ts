// Tipos compartidos — reflejan 1:1 el esquema de supabase/migrations/0001_init.sql.
// Mientras no hay conexión real a Supabase, las pantallas se alimentan de
// src/lib/mock-data.ts usando estos mismos tipos, para que el swap a datos
// reales (reemplazar el import) no toque los componentes.

export type Rol = "superadmin" | "admin" | "vendedor";

export type Pantalla =
  | "salidas"
  | "clientes"
  | "cobros"
  | "caja"
  | "reportes"
  | "tareas"
  | "mensajes"
  | "proveedores";

export interface Usuario {
  id: string;
  agenciaId: string | null;
  nombre: string;
  email: string;
  rol: Rol;
  permisos: Pantalla[];
  activo: boolean;
}

export interface Agencia {
  id: string;
  nombre: string;
  ciudad: string;
  activo: boolean;
}

export interface Hotel {
  id: string;
  agenciaId: string;
  nombre: string;
  contacto: string;
  telefono: string;
}

export interface AsistenciaViajero {
  id: string;
  agenciaId: string;
  nombre: string;
  contacto: string;
  telefono: string;
}

export interface Observacion {
  id: string;
  agenciaId: string;
  titulo: string;
  texto: string;
}

export type TipoHabitacion = "single" | "doble" | "triple" | "cuadruple";

export interface Servicio {
  id: string;
  agenciaId: string;
  origen: string;
  destino: string;
  fecha: string; // ISO date
  hora: string; // HH:mm
  tipoCoche: string;
  unidad: string;
  precioPasaje: number;
  incluyeHotel: boolean;
  hotelId: string | null;
  tiposHabitacionDisponibles: TipoHabitacion[];
  incluyeAsistencia: boolean;
  asistenciaId: string | null;
  observacionesIds: string[];
}

export type PisoAsiento = "superior" | "inferior";
export type EstadoAsiento = "libre" | "ocupado" | "pendiente";

export interface Asiento {
  id: string;
  servicioId: string;
  numero: number;
  piso: PisoAsiento;
  estado: EstadoAsiento;
}

export interface Cliente {
  id: string;
  agenciaId: string;
  nombre: string;
  apellido: string;
  dni: string;
  nacimiento: string | null;
  telefono: string;
  email: string;
  localidad: string;
  emerNombre: string;
  emerTelefono: string;
  emerParentesco: string;
  obraSocial: string;
  obraSocialNro: string;
}

export interface Reserva {
  id: string;
  agenciaId: string;
  servicioId: string;
  habitacionTipo: TipoHabitacion | null;
  codigoValidacion: string;
}

export interface ReservaPasajero {
  id: string;
  reservaId: string;
  asientoId: string;
  clienteId: string;
  esResponsable: boolean;
  precio: number;
}

export interface Pago {
  id: string;
  reservaPasajeroId: string;
  monto: number;
  medioPago: "efectivo" | "transferencia" | "tarjeta";
  fecha: string;
}
