"use server";

import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";

const INK = "#1C1F27";
const INK_SOFT = "#6B7280";
const INK_FAINT = "#9AA1AC";
const ACCENT = "#2E6E8E";

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
  telefono: "Teléfono",
  asiento: "Asiento",
  emergencia: "Contacto de emergencia",
  localidad: "Localidad",
  obraSocial: "Obra social",
};

// Ancho relativo de cada columna dentro de la tabla (suman ~1).
const COLUMN_WIDTHS: Record<string, number> = {
  nombre: 0.16,
  apellido: 0.16,
  dni: 0.13,
  telefono: 0.13,
  asiento: 0.08,
  emergencia: 0.22,
  localidad: 0.14,
  obraSocial: 0.14,
};

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
          .select("asiento_id, cliente_id")
          .eq("estado", "activo")
          .in("asiento_id", asientoIds)
      : { data: [] };
  const clienteIds = (rpData ?? []).map((rp) => rp.cliente_id);

  const { data: clientesData } =
    clienteIds.length > 0
      ? await supabase
          .from("clientes")
          .select("id, nombre, apellido, dni, telefono, localidad, emer_nombre, emer_telefono, emer_parentesco, obra_social, obra_social_nro")
          .in("id", clienteIds)
      : { data: [] };
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));

  const filas = (rpData ?? [])
    .map((rp) => {
      const cliente = clientePorId.get(rp.cliente_id);
      const numero = asientoPorId.get(rp.asiento_id);
      if (!cliente || numero === undefined) return null;
      const emergencia = [cliente.emer_nombre, cliente.emer_telefono, cliente.emer_parentesco].filter(Boolean).join(" · ");
      const obraSocial = [cliente.obra_social, cliente.obra_social_nro].filter(Boolean).join(" · ");
      const valores: Record<string, string> = {
        nombre: cliente.nombre || "",
        apellido: cliente.apellido || "",
        dni: cliente.dni || "",
        telefono: cliente.telefono || "",
        asiento: String(numero),
        emergencia: emergencia || "—",
        localidad: cliente.localidad || "—",
        obraSocial: obraSocial || "—",
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
