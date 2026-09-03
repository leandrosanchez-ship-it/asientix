"use server";

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";

const ACCENT = "#2E6E8E";
const INK = "#1C1F27";
const INK_SOFT = "#6B7280";
const INK_FAINT = "#9AA1AC";
const LINE = "#E3E5EA";

const HABITACION_LABELS: Record<string, string> = {
  single: "single",
  doble: "doble",
  triple: "triple",
  cuadruple: "cuádruple",
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fechaLarga(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMoney(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function slug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function generarBoletoPdf(input: { reservaPasajeroId: string }) {
  const usuario = await getCurrentUser();
  if (!usuario) throw new Error("No autorizado");

  const supabase = await createClient();

  const { data: rp } = await supabase
    .from("reserva_pasajeros")
    .select("id, reserva_id, asiento_id, cliente_id, precio, es_responsable")
    .eq("id", input.reservaPasajeroId)
    .single();
  if (!rp) throw new Error("No se encontró la reserva de este pasajero");

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, servicio_id, habitacion_tipo, codigo_validacion")
    .eq("id", rp.reserva_id)
    .single();
  if (!reserva) throw new Error("No se encontró la reserva");

  const { data: servicio } = await supabase
    .from("servicios")
    .select(
      "origen, destino, fecha, hora, tipo_coche, unidad, hotel_id, asistencia_id, observaciones_ids, agencia_id",
    )
    .eq("id", reserva.servicio_id)
    .single();
  if (!servicio) throw new Error("No se encontró el servicio");

  const { data: agencia } = await supabase.from("agencias").select("nombre").eq("id", servicio.agencia_id).single();

  // Todo el grupo (mismos compañeros de reserva), no solo este pasajero.
  const { data: grupoRp } = await supabase
    .from("reserva_pasajeros")
    .select("id, asiento_id, cliente_id, precio, es_responsable")
    .eq("reserva_id", rp.reserva_id)
    .eq("estado", "activo")
    .order("es_responsable", { ascending: false });
  const grupo = grupoRp && grupoRp.length > 0 ? grupoRp : [rp];

  const asientoIds = grupo.map((g) => g.asiento_id);
  const clienteIds = grupo.map((g) => g.cliente_id);
  const [{ data: asientosData }, { data: clientesData }, { data: hotel }, { data: asistencia }, { data: obsData }] =
    await Promise.all([
      supabase.from("asientos").select("id, numero").in("id", asientoIds),
      supabase.from("clientes").select("id, nombre, apellido, dni").in("id", clienteIds),
      servicio.hotel_id
        ? supabase.from("hoteles").select("nombre, contacto, telefono").eq("id", servicio.hotel_id).single()
        : Promise.resolve({ data: null }),
      servicio.asistencia_id
        ? supabase
            .from("asistencias_viajero")
            .select("nombre, contacto, telefono")
            .eq("id", servicio.asistencia_id)
            .single()
        : Promise.resolve({ data: null }),
      servicio.observaciones_ids?.length > 0
        ? supabase.from("observaciones").select("titulo, texto").in("id", servicio.observaciones_ids)
        : Promise.resolve({ data: [] }),
    ]);

  const asientoPorId = new Map((asientosData ?? []).map((a) => [a.id, a.numero as number]));
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));

  const pasajeros = grupo
    .map((g) => {
      const cliente = clientePorId.get(g.cliente_id);
      const numero = asientoPorId.get(g.asiento_id);
      if (!cliente || numero === undefined) return null;
      return {
        asiento: numero,
        nombre: `${cliente.apellido}, ${cliente.nombre}`,
        dni: cliente.dni || "—",
        esResponsable: g.es_responsable,
        precio: Number(g.precio),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.asiento - b.asiento);

  const responsable = pasajeros.find((p) => p.esResponsable) ?? pasajeros[0];
  const precioTotal = pasajeros.reduce((s, p) => s + p.precio, 0);
  const habitacionLabel = reserva.habitacion_tipo ? (HABITACION_LABELS[reserva.habitacion_tipo] ?? reserva.habitacion_tipo) : null;

  const qrDataUrl = await QRCode.toDataURL(reserva.codigo_validacion || reserva.id, {
    margin: 1,
    width: 240,
    color: { dark: "#1C1F27", light: "#FFFFFF" },
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A5", margin: 32 });
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const pageWidth = doc.page.width - 64;

  // Header
  doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica-Bold").text("VOUCHER DE VIAJE · RESERVA GRUPAL", { characterSpacing: 0.5 });
  doc.moveDown(0.15);
  doc.fillColor(INK).fontSize(15).font("Helvetica-Bold").text(agencia?.nombre ?? "Asientix");
  doc.moveDown(0.6);

  doc.fillColor(INK).fontSize(14).font("Helvetica-Bold").text(`${servicio.origen} → ${servicio.destino}`);
  doc.fillColor(INK_SOFT).fontSize(9).font("Helvetica").text(
    `${fechaLarga(servicio.fecha)} · ${(servicio.hora ?? "").slice(0, 5)} hs · ${servicio.tipo_coche}${servicio.unidad ? " · " + servicio.unidad : ""}`,
  );
  doc.moveDown(0.7);

  // Pasajeros
  doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica-Bold").text(`PASAJEROS (${pasajeros.length})`, { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  pasajeros.forEach((p) => {
    const y = doc.y;
    doc.fillColor(ACCENT).roundedRect(32, y, 26, 16, 3).fillOpacity(0.12).fill();
    doc.fillOpacity(1).fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text(String(p.asiento), 32, y + 4, {
      width: 26,
      align: "center",
    });
    doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text(p.nombre, 66, y, { continued: false });
    doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica").text(`DNI ${p.dni}`, 66, doc.y);
    if (p.esResponsable) {
      doc
        .fillColor("#92400E")
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("★ RESPONSABLE", pageWidth - 60, y + 2, { width: 92, align: "right" });
    }
    doc.moveDown(0.5);
    doc
      .moveTo(32, doc.y)
      .lineTo(32 + pageWidth, doc.y)
      .strokeColor(LINE)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.35);
  });

  doc.moveDown(0.3);
  const colWidth = pageWidth / 2;
  const rowY = doc.y;
  doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("PRECIO TOTAL", 32, rowY);
  doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text(fmtMoney(precioTotal), 32, doc.y);
  doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("EMITIDO", 32 + colWidth, rowY);
  doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text(
    new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    32 + colWidth,
    doc.y - 12,
  );
  doc.moveDown(0.9);

  // Adicionales
  if (hotel || asistencia || (obsData && obsData.length > 0)) {
    if (hotel) {
      const y0 = doc.y;
      doc.rect(32, y0, pageWidth, habitacionLabel ? 40 : 32).fillColor("#F4F5F7").fill();
      doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("HOTEL INCLUIDO", 42, y0 + 6);
      doc
        .fillColor(INK)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(`${hotel.nombre}${habitacionLabel ? " · Habitación " + habitacionLabel : ""}`, 42, doc.y);
      if (hotel.contacto || hotel.telefono) {
        doc
          .fillColor(INK_SOFT)
          .fontSize(8)
          .font("Helvetica")
          .text([hotel.contacto, hotel.telefono].filter(Boolean).join(" · "), 42, doc.y);
      }
      doc.y = y0 + (habitacionLabel ? 40 : 32) + 8;
    }
    if (asistencia) {
      const y0 = doc.y;
      doc.rect(32, y0, pageWidth, 32).fillColor("#F4F5F7").fill();
      doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("ASISTENCIA AL VIAJERO INCLUIDA", 42, y0 + 6);
      doc.fillColor(INK).fontSize(9).font("Helvetica-Bold").text(asistencia.nombre, 42, doc.y);
      if (asistencia.contacto || asistencia.telefono) {
        doc
          .fillColor(INK_SOFT)
          .fontSize(8)
          .font("Helvetica")
          .text([asistencia.contacto, asistencia.telefono].filter(Boolean).join(" · "), 42, doc.y);
      }
      doc.y = y0 + 32 + 8;
    }
    if (obsData && obsData.length > 0) {
      doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("OBSERVACIONES", 32, doc.y, { characterSpacing: 0.5 });
      doc.moveDown(0.2);
      obsData.forEach((o) => {
        doc.fillColor(INK).fontSize(8.5).font("Helvetica-Bold").text(o.titulo, 32, doc.y);
        doc.fillColor(INK_SOFT).fontSize(8).font("Helvetica").text(o.texto, 32, doc.y, { width: pageWidth });
        doc.moveDown(0.3);
      });
    }
  } else {
    doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica-Oblique").text("Este servicio no incluye adicionales — solo el pasaje.", { align: "center" });
  }

  doc.moveDown(0.6);
  doc
    .moveTo(32, doc.y)
    .lineTo(32 + pageWidth, doc.y)
    .dash(3, { space: 2 })
    .strokeColor("#DDE1E6")
    .stroke();
  doc.undash();
  doc.moveDown(0.7);

  // QR + validación
  doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica-Bold").text("VALIDACIÓN DE LA RESERVA", { align: "center", characterSpacing: 0.5 });
  doc.moveDown(0.3);
  const qrSize = 96;
  const qrX = 32 + pageWidth / 2 - qrSize / 2;
  doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
  doc.y += qrSize + 8;
  doc
    .fillColor(INK)
    .fontSize(10)
    .font("Courier-Bold")
    .text(reserva.codigo_validacion || "—", { align: "center" });
  doc.moveDown(0.2);
  doc
    .fillColor(INK_FAINT)
    .fontSize(7.5)
    .font("Helvetica")
    .text("El chofer o el control de acceso escanea este código para confirmar que la reserva es válida.", {
      align: "center",
    });

  doc.end();
  const buffer = await done;

  const archivo =
    pasajeros.length > 1
      ? `boleto-grupal-${slug(responsable.nombre)}-asientos-${pasajeros.map((p) => p.asiento).join("-")}.pdf`
      : `boleto-${slug(responsable.nombre)}-asiento${responsable.asiento}.pdf`;

  return { base64: buffer.toString("base64"), filename: archivo };
}
