// Datos de ejemplo — mismos nombres/números que la maqueta (.dc.html), para que
// esta primera versión del código real se sienta como el mismo producto.
// Reemplazar por consultas a Supabase cuando el proyecto esté conectado
// (ver TODO en cada pantalla que importa de acá).

import type {
  Agencia,
  Asiento,
  AsistenciaViajero,
  Cliente,
  Hotel,
  Observacion,
  Pago,
  Reserva,
  ReservaPasajero,
  Servicio,
  Usuario,
} from "./types";

export const AGENCIA_SEQUEIRA: Agencia = {
  id: "agencia-sequeira",
  nombre: "Sequeira Tours",
  ciudad: "Villa Carlos Paz",
  activo: true,
};

export const USUARIOS: Usuario[] = [
  {
    id: "user-superadmin",
    agenciaId: null,
    nombre: "Lean (Assertix)",
    email: "lean@assertix.dev",
    rol: "superadmin",
    permisos: [],
    activo: true,
  },
  {
    id: "user-admin-sequeira",
    agenciaId: AGENCIA_SEQUEIRA.id,
    nombre: "Marcela Sequeira",
    email: "marcela@sequeiratours.com",
    rol: "admin",
    permisos: [],
    activo: true,
  },
  {
    id: "user-vendedor-sequeira",
    agenciaId: AGENCIA_SEQUEIRA.id,
    nombre: "Julián Ríos",
    email: "julian@sequeiratours.com",
    rol: "vendedor",
    permisos: ["salidas", "clientes", "cobros", "mensajes"],
    activo: true,
  },
];

export const HOTELES: Hotel[] = [
  { id: "hotel-portal-lago", agenciaId: AGENCIA_SEQUEIRA.id, nombre: "Hotel Portal del Lago", contacto: "Silvina Roldán", telefono: "3541 42-1187" },
  { id: "hotel-yastay", agenciaId: AGENCIA_SEQUEIRA.id, nombre: "Hotel Yastay", contacto: "Marcos Peralta", telefono: "3541 43-0092" },
  { id: "hotel-nuevo-sayago", agenciaId: AGENCIA_SEQUEIRA.id, nombre: "Hotel Nuevo Sayago", contacto: "Carla Funes", telefono: "3541 44-7765" },
];

export const ASISTENCIAS: AsistenciaViajero[] = [
  { id: "asist-assist-card", agenciaId: AGENCIA_SEQUEIRA.id, nombre: "Assist Card", contacto: "Central de ventas", telefono: "0810 555-2728" },
  { id: "asist-universal", agenciaId: AGENCIA_SEQUEIRA.id, nombre: "Universal Assistance", contacto: "Central de ventas", telefono: "0810 777-8632" },
  { id: "asist-travel-ace", agenciaId: AGENCIA_SEQUEIRA.id, nombre: "Travel Ace", contacto: "Central de ventas", telefono: "0810 333-8223" },
];

export const OBSERVACIONES: Observacion[] = [
  { id: "obs-equipaje", agenciaId: AGENCIA_SEQUEIRA.id, titulo: "Equipaje", texto: "Se permite 1 bulto de hasta 20kg por pasajero. Equipaje adicional con costo extra a coordinar con la agencia." },
  { id: "obs-documentacion", agenciaId: AGENCIA_SEQUEIRA.id, titulo: "Documentación", texto: "Es obligatorio viajar con DNI vigente. Para menores de edad, autorización notarial si viajan sin ambos padres." },
  { id: "obs-punto-encuentro", agenciaId: AGENCIA_SEQUEIRA.id, titulo: "Punto de encuentro", texto: "Presentarse en el punto de encuentro con 30 minutos de anticipación al horario de salida indicado." },
  { id: "obs-cancelaciones", agenciaId: AGENCIA_SEQUEIRA.id, titulo: "Cancelaciones", texto: "Cancelaciones con menos de 48hs de anticipación no reintegran el valor del pasaje, solo permiten reprogramación." },
];

export const SERVICIOS: Servicio[] = [
  {
    id: "servicio-vcp-retiro",
    agenciaId: AGENCIA_SEQUEIRA.id,
    origen: "Villa Carlos Paz",
    destino: "Retiro (Bs. As.)",
    fecha: "2026-08-28",
    hora: "22:30",
    tipoCoche: "Semi-Cama",
    unidad: "Coche 12",
    precioPasaje: 45000,
    incluyeHotel: true,
    hotelId: HOTELES[0].id,
    tiposHabitacionDisponibles: ["doble", "cuadruple"],
    incluyeAsistencia: true,
    asistenciaId: ASISTENCIAS[0].id,
    observacionesIds: [OBSERVACIONES[0].id, OBSERVACIONES[2].id],
  },
  {
    id: "servicio-vcp-rosario",
    agenciaId: AGENCIA_SEQUEIRA.id,
    origen: "Villa Carlos Paz",
    destino: "Rosario",
    fecha: "2026-08-29",
    hora: "21:00",
    tipoCoche: "Coche Cama",
    unidad: "Coche 8",
    precioPasaje: 52000,
    incluyeHotel: false,
    hotelId: null,
    tiposHabitacionDisponibles: [],
    incluyeAsistencia: false,
    asistenciaId: null,
    observacionesIds: [],
  },
  {
    id: "servicio-vcp-mendoza",
    agenciaId: AGENCIA_SEQUEIRA.id,
    origen: "Villa Carlos Paz",
    destino: "Mendoza",
    fecha: "2026-08-29",
    hora: "23:15",
    tipoCoche: "Semi-Cama",
    unidad: "Coche 5",
    precioPasaje: 41000,
    incluyeHotel: false,
    hotelId: null,
    tiposHabitacionDisponibles: [],
    incluyeAsistencia: false,
    asistenciaId: null,
    observacionesIds: [],
  },
];

// Numeración real de doble piso (ver Main.dc.html): superior 10-55+59-60 (48
// asientos, semi-cama), inferior 1-9+56-58 (12 asientos, cama) — no correlativa.
export const SUPERIOR_IDS = [
  ...Array.from({ length: 46 }, (_, i) => i + 10), // 10..55
  59,
  60,
];
export const INFERIOR_IDS = [
  ...Array.from({ length: 9 }, (_, i) => i + 1), // 1..9
  56,
  57,
  58,
];

interface SeatSeed {
  numero: number;
  estado: Asiento["estado"];
  cliente?: Omit<Cliente, "id" | "agenciaId">;
  esResponsable?: boolean;
  saldoPendiente?: number; // si falta, se asume pagado en su totalidad
  grupoDe?: number[]; // otros números de asiento que comparten esta reserva
}

const CLIENTE_BASE: Omit<Cliente, "id" | "agenciaId" | "nombre" | "apellido" | "dni" | "telefono"> = {
  nacimiento: null,
  email: "",
  localidad: "Villa Carlos Paz",
  emerNombre: "",
  emerTelefono: "",
  emerParentesco: "",
  obraSocial: "",
  obraSocialNro: "",
};

const SEAT_SEEDS: SeatSeed[] = [
  {
    numero: 7,
    estado: "ocupado",
    esResponsable: false,
    saldoPendiente: 31500,
    cliente: { ...CLIENTE_BASE, nombre: "María", apellido: "Brizuela", dni: "27.884.219", telefono: "351 555-0112" },
  },
  { numero: 12, estado: "ocupado", saldoPendiente: 31500, cliente: { ...CLIENTE_BASE, nombre: "Martina", apellido: "Gomez", dni: "30.221.884", telefono: "351 555-0110" } },
  { numero: 17, estado: "ocupado", cliente: { ...CLIENTE_BASE, nombre: "Lucas", apellido: "Fernandez", dni: "29.887.112", telefono: "351 555-0111" } },
  { numero: 22, estado: "ocupado", saldoPendiente: 45000, cliente: { ...CLIENTE_BASE, nombre: "Diego", apellido: "Perez", dni: "31.445.221", telefono: "351 555-0112" } },
  { numero: 31, estado: "ocupado", cliente: { ...CLIENTE_BASE, nombre: "Camila", apellido: "Sosa", dni: "28.774.556", telefono: "351 555-0113" } },
  { numero: 42, estado: "ocupado", saldoPendiente: 25000, cliente: { ...CLIENTE_BASE, nombre: "Franco", apellido: "Acosta", dni: "27.663.998", telefono: "351 555-0114" } },
  { numero: 50, estado: "ocupado", cliente: { ...CLIENTE_BASE, nombre: "Valentina", apellido: "Diaz", dni: "32.556.774", telefono: "351 555-0115" } },
  { numero: 54, estado: "ocupado", saldoPendiente: 15000, cliente: { ...CLIENTE_BASE, nombre: "Juan", apellido: "Romero", dni: "26.774.556", telefono: "351 555-0116" } },
  { numero: 2, estado: "ocupado", cliente: { ...CLIENTE_BASE, nombre: "Sofia", apellido: "Ibanez", dni: "33.221.009", telefono: "351 555-0117" } },
  { numero: 57, estado: "ocupado", cliente: { ...CLIENTE_BASE, nombre: "Tomas", apellido: "Molina", dni: "29.112.887", telefono: "351 555-0118" } },
  { numero: 15, estado: "pendiente", cliente: { ...CLIENTE_BASE, nombre: "Rocio", apellido: "Cabrera", dni: "31.998.221", telefono: "351 555-0210" } },
  { numero: 38, estado: "pendiente", cliente: { ...CLIENTE_BASE, nombre: "Ezequiel", apellido: "Luna", dni: "28.556.331", telefono: "351 555-0211" } },
  { numero: 4, estado: "pendiente", cliente: { ...CLIENTE_BASE, nombre: "Nicolas", apellido: "Vega", dni: "30.887.445", telefono: "351 555-0212" } },
];

interface AsientosGenerados {
  asientos: Asiento[];
  clientes: Cliente[];
  reservas: Reserva[];
  reservaPasajeros: ReservaPasajero[];
  pagos: Pago[];
}

/** Genera los 60 asientos de un servicio + reservas/pasajeros/pagos de ejemplo. */
export function generarAsientosDemo(servicioId: string): AsientosGenerados {
  const asientos: Asiento[] = [];
  const clientes: Cliente[] = [];
  const reservas: Reserva[] = [];
  const reservaPasajeros: ReservaPasajero[] = [];
  const pagos: Pago[] = [];

  const seedByNumero = new Map(SEAT_SEEDS.map((s) => [s.numero, s]));
  const allIds = [...SUPERIOR_IDS, ...INFERIOR_IDS];

  allIds.forEach((numero) => {
    const piso = SUPERIOR_IDS.includes(numero) ? "superior" : "inferior";
    const seed = seedByNumero.get(numero);
    const asientoId = `${servicioId}-asiento-${numero}`;

    asientos.push({
      id: asientoId,
      servicioId,
      numero,
      piso,
      estado: seed?.estado ?? "libre",
    });

    if (seed?.cliente) {
      const clienteId = `${asientoId}-cliente`;
      clientes.push({ id: clienteId, agenciaId: AGENCIA_SEQUEIRA.id, ...seed.cliente });

      const reservaId = `${asientoId}-reserva`;
      reservas.push({
        id: reservaId,
        agenciaId: AGENCIA_SEQUEIRA.id,
        servicioId,
        habitacionTipo: null,
        codigoValidacion: `AXT-${servicioId.slice(-4).toUpperCase()}-${numero}`,
      });

      const precio = SERVICIOS.find((s) => s.id === servicioId)?.precioPasaje ?? 45000;
      reservaPasajeros.push({
        id: `${asientoId}-rp`,
        reservaId,
        asientoId,
        clienteId,
        esResponsable: seed.esResponsable ?? true,
        precio,
      });

      const pagado = precio - (seed.saldoPendiente ?? 0);
      if (pagado > 0) {
        pagos.push({
          id: `${asientoId}-pago`,
          reservaPasajeroId: `${asientoId}-rp`,
          monto: pagado,
          medioPago: "efectivo",
          moneda: "ARS",
          fecha: "2026-08-20T09:14:00-03:00",
        });
      }
    }
  });

  return { asientos, clientes, reservas, reservaPasajeros, pagos };
}
