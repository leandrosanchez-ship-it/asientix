"use server";

import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import { ACCENT } from "@/lib/theme";
import { habitacionLabel } from "@/lib/habitacion";

const INK = "#1C1F27";
const INK_SOFT = "#6B7280";
const INK_FAINT = "#9AA1AC";

function slug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const COLUMN_LABELS: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  dni: "DNI",
  asiento: "Asiento",
  emergencia: "Contacto de emergencia",
  embarque: "Embarque",
  fechaNacimiento: "Fecha de nacimiento",
  edad: "Edad",
  habitacion: "Habitación",
};

// Ancho relativo de cada columna dentro de la tabla (suman ~1).
const COLUMN_WIDTHS: Record<string, number> = {
  nombre: 0.15,
  apellido: 0.15,
  dni: 0.12,
  asiento: 0.08,
  emergencia: 0.2,
  embarque: 0.13,
  fechaNacimiento: 0.13,
  edad: 0.07,
  habitacion: 0.12,
};

function calcularEdad(nacimientoIso: string | null): string {
  if (!nacimientoIso) return "—";
  const hoy = new Date();
  const nac = new Date(`${nacimientoIso}T00:00:00`);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const noCumplioAun = hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
  if (noCumplioAun) edad -= 1;
  return edad >= 0 ? String(edad) : "—";
}

function formatFechaNacimiento(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface MovimientoMes {
  fecha: string;
  fechaOrden: string;
  pasajero: string;
  servicio: string;
  vendedor: string;
  monto: number;
  medio: string;
}

export interface MesDataResult {
  total: number;
  pasajes: number;
  servicios: number;
  rutas: { nombre: string; monto: number; pct: number }[];
  movimientos: MovimientoMes[];
}

function fechaDDMMYYYY(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Trae y agrupa los datos de UN solo mes (mesKey = "YYYY-MM"), en vez de
 * recorrer el historial completo de la agencia como hacía antes la página
 * de Reportes en cada visita — eso escalaba mal (recalculaba TODOS los
 * meses de vida de la agencia en cada carga, aunque solo se mostrara uno).
 * Ahora cada mes se trae bajo demanda, filtrando por servicios.fecha desde
 * la base — no en JS después de traer todo.
 */
export async function obtenerDatosMes(mesKey: string): Promise<MesDataResult> {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "reportes")) throw new Error("No autorizado");

  const supabase = await createClient();
  const [y, m] = mesKey.split("-").map(Number);
  const desde = `${mesKey}-01`;
  const hastaDate = new Date(y, m, 1); // primer día del mes siguiente
  const hasta = `${hastaDate.getFullYear()}-${String(hastaDate.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: serviciosData } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha")
    .eq("agencia_id", usuario.agenciaId)
    .gte("fecha", desde)
    .lt("fecha", hasta);
  const servicios = serviciosData ?? [];
  if (servicios.length === 0) return { total: 0, pasajes: 0, servicios: 0, rutas: [], movimientos: [] };

  const servicioPorId = new Map(servicios.map((s) => [s.id, s]));
  const servicioIds = servicios.map((s) => s.id);

  const { data: asientosData } = await supabase.from("asientos").select("id, servicio_id").in("servicio_id", servicioIds);
  const servicioPorAsiento = new Map((asientosData ?? []).map((a) => [a.id, a.servicio_id]));
  const asientoIds = (asientosData ?? []).map((a) => a.id);

  const { data: rpData } =
    asientoIds.length > 0
      ? await supabase.from("reserva_pasajeros").select("id, asiento_id, cliente_id, precio, reserva_id").eq("estado", "activo").in("asiento_id", asientoIds)
      : { data: [] };
  const rps = rpData ?? [];
  const rpIds = rps.map((rp) => rp.id);
  const rpPorId = new Map(rps.map((rp) => [rp.id, rp]));
  const clienteIds = [...new Set(rps.map((rp) => rp.cliente_id))];
  const reservaIds = [...new Set(rps.map((rp) => rp.reserva_id))];

  const [{ data: pagosData }, { data: clientesData }, { data: reservasData }] = await Promise.all([
    rpIds.length > 0
      ? supabase.from("pagos").select("reserva_pasajero_id, monto, medio_pago, fecha").in("reserva_pasajero_id", rpIds)
      : Promise.resolve({ data: [] }),
    clienteIds.length > 0
      ? supabase.from("clientes").select("id, nombre, apellido").in("id", clienteIds)
      : Promise.resolve({ data: [] }),
    reservaIds.length > 0
      ? supabase.from("reservas").select("id, vendedor_id").in("id", reservaIds)
      : Promise.resolve({ data: [] }),
  ]);
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));
  const vendedorIdPorReserva = new Map((reservasData ?? []).map((r) => [r.id, r.vendedor_id]));
  const vendedorIds = [...new Set((reservasData ?? []).map((r) => r.vendedor_id).filter((x): x is string => !!x))];
  const { data: usuariosData } =
    vendedorIds.length > 0 ? await supabase.from("usuarios").select("id, nombre").in("id", vendedorIds) : { data: [] };
  const vendedorNombrePorId = new Map((usuariosData ?? []).map((u) => [u.id, u.nombre]));

  const rutaMontoMap = new Map<string, number>();
  rps.forEach((rp) => {
    const servicioId = servicioPorAsiento.get(rp.asiento_id);
    const servicio = servicioId ? servicioPorId.get(servicioId) : undefined;
    if (!servicio) return;
    rutaMontoMap.set(servicio.destino, (rutaMontoMap.get(servicio.destino) ?? 0) + Number(rp.precio));
  });

  const movimientos: MovimientoMes[] = [];
  let total = 0;
  (pagosData ?? []).forEach((p) => {
    const rp = rpPorId.get(p.reserva_pasajero_id);
    if (!rp) return;
    const servicioId = servicioPorAsiento.get(rp.asiento_id);
    const servicio = servicioId ? servicioPorId.get(servicioId) : undefined;
    if (!servicio) return;
    total += Number(p.monto);
    const cliente = clientePorId.get(rp.cliente_id);
    const vendedorId = vendedorIdPorReserva.get(rp.reserva_id);
    movimientos.push({
      fecha: fechaDDMMYYYY(p.fecha),
      fechaOrden: p.fecha,
      pasajero: cliente ? `${cliente.apellido}, ${cliente.nombre}` : "—",
      servicio: `${servicio.origen} → ${servicio.destino}`,
      vendedor: vendedorId ? (vendedorNombrePorId.get(vendedorId) ?? "—") : "—",
      monto: Number(p.monto),
      medio: p.medio_pago === "efectivo" ? "Efectivo" : p.medio_pago === "transferencia" ? "Transferencia" : "Tarjeta",
    });
  });
  movimientos.sort((a, b) => (a.fechaOrden < b.fechaOrden ? 1 : -1));

  const maxRuta = Math.max(1, ...rutaMontoMap.values());
  const rutas = [...rutaMontoMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, monto]) => ({ nombre, monto, pct: Math.max(Math.round((monto / maxRuta) * 100), 4) }));

  return { total, pasajes: rps.length, servicios: servicios.length, rutas, movimientos };
}

export interface GenerarListaPasajerosInput {
  servicioId: string;
  plantilla: "coordinador" | "colectivo" | "hotel";
  columnas: string[];
}

export async function generarListaPasajerosPdf(input: GenerarListaPasajerosInput) {
  const usuario = await getCurrentUser();
  if (!usuario || !tienePermiso(usuario, "reportes")) throw new Error("No autorizado");
  if (input.columnas.length === 0) throw new Error("Elegí al menos una columna");

  const supabase = await createClient();

  const { data: servicio } = await supabase
    .from("servicios")
    .select("origen, destino, fecha, hora, tipo_coche")
    .eq("id", input.servicioId)
    .single();
  if (!servicio) throw new Error("No se encontró el servicio");

  const { data: asientosData } = await supabase
    .from("asientos")
    .select("id, numero")
    .eq("servicio_id", input.servicioId);
  const asientoIds = (asientosData ?? []).map((a) => a.id);
  const asientoPorId = new Map((asientosData ?? []).map((a) => [a.id, a.numero as number]));

  const { data: rpData } =
    asientoIds.length > 0
      ? await supabase
          .from("reserva_pasajeros")
          .select("asiento_id, cliente_id, reserva_id, embarque")
          .eq("estado", "activo")
          .in("asiento_id", asientoIds)
      : { data: [] };
  const clienteIds = (rpData ?? []).map((rp) => rp.cliente_id);
  const reservaIds = [...new Set((rpData ?? []).map((rp) => rp.reserva_id))];

  const [{ data: clientesData }, { data: reservasData }] = await Promise.all([
    clienteIds.length > 0
      ? supabase
          .from("clientes")
          .select("id, nombre, apellido, dni, nacimiento, emer_nombre, emer_telefono, emer_parentesco")
          .in("id", clienteIds)
      : Promise.resolve({ data: [] }),
    reservaIds.length > 0
      ? supabase.from("reservas").select("id, habitacion_tipo").in("id", reservaIds)
      : Promise.resolve({ data: [] }),
  ]);
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));
  const habitacionPorReserva = new Map((reservasData ?? []).map((r) => [r.id, r.habitacion_tipo]));

  const filas = (rpData ?? [])
    .map((rp) => {
      const cliente = clientePorId.get(rp.cliente_id);
      const numero = asientoPorId.get(rp.asiento_id);
      if (!cliente || numero === undefined) return null;
      const emergencia = [cliente.emer_nombre, cliente.emer_telefono, cliente.emer_parentesco].filter(Boolean).join(" · ");
      const valores: Record<string, string> = {
        nombre: cliente.nombre || "",
        apellido: cliente.apellido || "",
        dni: cliente.dni || "",
        asiento: String(numero),
        emergencia: emergencia || "—",
        embarque: rp.embarque || "—",
        fechaNacimiento: formatFechaNacimiento(cliente.nacimiento),
        edad: calcularEdad(cliente.nacimiento),
        habitacion: habitacionLabel(habitacionPorReserva.get(rp.reserva_id) ?? null) ?? "—",
      };
      return { numero, valores };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => a.numero - b.numero);

  const columnas = input.columnas.filter((c) => c in COLUMN_LABELS);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const pageWidth = doc.page.width - 72;

  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const d = new Date(`${servicio.fecha}T00:00:00`);
  const fechaLarga = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;

  const PLANTILLA_LABEL: Record<string, string> = { coordinador: "Coordinador", colectivo: "Colectivo", hotel: "Hotel" };

  doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica-Bold").text(`LISTA DE PASAJEROS · PLANTILLA ${PLANTILLA_LABEL[input.plantilla].toUpperCase()}`, { characterSpacing: 0.5 });
  doc.moveDown(0.15);
  // "→" no existe en WinAnsiEncoding (fuentes estándar de pdfkit) y sale
  // como un glifo random — ver la misma nota en actions/boleto.ts.
  doc.fillColor(INK).fontSize(15).font("Helvetica-Bold").text(`${servicio.origen} -> ${servicio.destino}`);
  doc.fillColor(INK_SOFT).fontSize(9).font("Helvetica").text(`${fechaLarga} · ${(servicio.hora ?? "").slice(0, 5)} hs · ${servicio.tipo_coche}`);
  doc.moveDown(0.7);

  const startX = 36;
  const colWidths = columnas.map((c) => (COLUMN_WIDTHS[c] ?? 0.15) * pageWidth);
  const totalW = colWidths.reduce((s, w) => s + w, 0);
  const scale = pageWidth / totalW; // normaliza para que ocupen exactamente pageWidth
  const widths = colWidths.map((w) => w * scale);

  function colX(i: number) {
    return startX + widths.slice(0, i).reduce((s, w) => s + w, 0);
  }

  // Header de la tabla
  let y = doc.y;
  doc.rect(startX, y, pageWidth, 22).fillColor(ACCENT).fill();
  columnas.forEach((c, i) => {
    doc.fillColor("#fff").fontSize(8).font("Helvetica-Bold").text(COLUMN_LABELS[c], colX(i) + 6, y + 7, { width: widths[i] - 10 });
  });
  y += 22;

  const rowH = 20;
  filas.forEach((fila, idx) => {
    if (y + rowH > doc.page.height - 40) {
      doc.addPage();
      y = 36;
      doc.rect(startX, y, pageWidth, 22).fillColor(ACCENT).fill();
      columnas.forEach((c, i) => {
        doc.fillColor("#fff").fontSize(8).font("Helvetica-Bold").text(COLUMN_LABELS[c], colX(i) + 6, y + 7, { width: widths[i] - 10 });
      });
      y += 22;
    }
    if (idx % 2 === 1) {
      doc.rect(startX, y, pageWidth, rowH).fillColor("#F7F8F7").fill();
    }
    columnas.forEach((c, i) => {
      doc
        .fillColor(INK)
        .fontSize(8.5)
        .font("Helvetica")
        .text(fila.valores[c] ?? "", colX(i) + 6, y + 6, { width: widths[i] - 10, height: rowH - 8, ellipsis: true });
    });
    y += rowH;
  });

  doc.y = y;

  if (filas.length === 0) {
    doc.moveDown(1);
    doc.fillColor(INK_FAINT).fontSize(9).font("Helvetica-Oblique").text("Este servicio todavía no tiene pasajeros activos.");
  }

  doc.end();
  const buffer = await done;

  const filename = `lista-pasajeros-${slug(servicio.destino)}-${input.servicioId.slice(0, 8)}-${input.plantilla}.pdf`;
  return { base64: buffer.toString("base64"), filename };
}
