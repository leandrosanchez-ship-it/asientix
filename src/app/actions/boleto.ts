"use server";

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { ACCENT } from "@/lib/theme";
import { SUPERIOR_ROWS, INFERIOR_ROWS, type SeatCell } from "@/lib/seat-layout";
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

// Mini-mapa de ubicación: pinta los mismos casilleros del piso real
// (seat-layout.ts, la misma fuente que usa el mapa de asientos interactivo)
// resaltando en el color de marca solo las butacas de este grupo — así el
// pasajero ubica su lugar por POSICIÓN (fila, lado, piso) aunque el coche
// real tenga una numeración distinta a la impresa. Devuelve el alto/ancho
// realmente usado para poder acomodar lo que sigue debajo.
function drawFloorMiniMap(
  doc: PDFKit.PDFDocument,
  rows: SeatCell[][],
  numerosDelGrupo: Set<number>,
  centerX: number,
  y: number,
) {
  // Chico a propósito: son 13 filas en el piso superior nomás para mostrar
  // la posición, y el voucher (A5) todavía no pagina solo si el contenido no
  // entra — cuanto más compacto, menos riesgo de desbordar en un grupo grande.
  const cell = 5.5;
  const gap = 1.1;
  const cellWidth = (c: SeatCell) => (c.type === "gap" ? cell * 0.55 : c.wide ? cell * 2 + gap : cell);
  const rowWidth = (row: SeatCell[]) => row.reduce((w, c) => w + cellWidth(c) + gap, -gap);
  const widths = rows.map(rowWidth);
  const mapWidth = Math.max(...widths);

  let curY = y;
  rows.forEach((row, ri) => {
    let curX = centerX - widths[ri] / 2;
    row.forEach((c) => {
      const w = cellWidth(c);
      if (c.type === "seat") {
        const propio = numerosDelGrupo.has(c.numero);
        doc
          .roundedRect(curX, curY, w, cell, 1.2)
          .fillColor(propio ? ACCENT : "#E3E5EA")
          .fill();
      } else if (c.type === "amenity") {
        doc.roundedRect(curX, curY, w, cell, 1.2).fillColor("#EFF1EF").fill();
      }
      curX += w + gap;
    });
    curY += cell + gap;
  });

  return { height: curY - y, width: mapWidth };
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
      supabase.from("asientos").select("id, numero, piso").in("id", asientoIds),
      supabase.from("clientes").select("id, nombre, apellido, dni").in("id", clienteIds),
      servicio.hotel_id
        ? supabase.from("hoteles").select("nombre").eq("id", servicio.hotel_id).single()
        : Promise.resolve({ data: null }),
      servicio.asistencia_id
        ? supabase.from("asistencias_viajero").select("nombre").eq("id", servicio.asistencia_id).single()
        : Promise.resolve({ data: null }),
      servicio.observaciones_ids?.length > 0
        ? supabase.from("observaciones").select("titulo, texto").in("id", servicio.observaciones_ids)
        : Promise.resolve({ data: [] }),
    ]);

  const asientoPorId = new Map((asientosData ?? []).map((a) => [a.id, a]));
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));

  const pasajeros = grupo
    .map((g) => {
      const cliente = clientePorId.get(g.cliente_id);
      const asiento = asientoPorId.get(g.asiento_id);
      if (!cliente || !asiento) return null;
      return {
        asiento: asiento.numero as number,
        // El tipo de butaca es el de ESTE asiento puntual (piso superior =
        // semi-cama, piso inferior = cama en la disposición real del coche),
        // no el `tipo_coche` genérico del servicio — un mismo servicio
        // "Ambos" puede vender asientos de los dos tipos en la misma salida.
        tipoAsiento: asiento.piso === "superior" ? "Semi-Cama" : "Cama",
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

  // El QR ahora codifica un link real a una página pública de verificación
  // (sin login) en vez del código pelado — quien lo escanea ve directamente
  // qué incluye la reserva, no solo un string sin sentido para un humano.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://asientix.com.ar";
  const urlVerificacion = `${siteUrl}/verificar/${encodeURIComponent(reserva.codigo_validacion || reserva.id)}`;
  const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
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

  // "→" (U+2192) no existe en WinAnsiEncoding (la única codificación que
  // soportan las fuentes estándar de pdfkit) — pdfkit lo reemplaza en
  // silencio por un glifo cualquiera de esa tabla, así salía "!'" en vez de
  // la flecha. "->" es ASCII puro, se ve bien en cualquier fuente.
  doc.fillColor(INK).fontSize(14).font("Helvetica-Bold").text(`${servicio.origen} -> ${servicio.destino}`);
  // El tipo de coche del servicio ("Ambos", por ejemplo) no dice qué butaca
  // compró cada pasajero — eso ahora se muestra por pasajero (Semi-Cama o
  // Cama según el piso real del asiento vendido), no acá arriba.
  doc.fillColor(INK_SOFT).fontSize(9).font("Helvetica").text(
    `${fechaLarga(servicio.fecha)} · ${(servicio.hora ?? "").slice(0, 5)} hs${servicio.unidad ? " · " + servicio.unidad : ""}`,
  );
  doc.moveDown(0.7);

  // Pasajeros — cada fila usa un alto fijo (rowH) y todo se posiciona con
  // coordenadas explícitas relativas a `rowY0`, en vez de encadenar llamadas
  // a .text() que dependen de dónde haya quedado el cursor de la anterior —
  // eso es lo que producía superposiciones cuando una fila tenía RESPONSABLE
  // o un nombre largo.
  doc.fillColor(INK_FAINT).fontSize(8).font("Helvetica-Bold").text(`PASAJEROS (${pasajeros.length})`, { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  // 30 en vez de 34: el mini-mapa nuevo de más abajo ya usa bastante alto de
  // página — hay que recuperar unos puntos acá para que un voucher de varios
  // pasajeros con adicionales siga entrando en una sola hoja A5 (todavía no
  // hay paginación automática real para cuando no entra).
  const rowH = 30;
  pasajeros.forEach((p) => {
    const rowY0 = doc.y;

    doc.fillColor(ACCENT).roundedRect(32, rowY0, 26, 16, 3).fillOpacity(0.12).fill();
    doc.fillOpacity(1).fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text(String(p.asiento), 32, rowY0 + 4, {
      width: 26,
      align: "center",
    });

    const nombreWidth = p.esResponsable ? pageWidth - 34 - 92 : pageWidth - 34;
    doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text(p.nombre, 66, rowY0, { width: nombreWidth, lineBreak: false });
    doc
      .fillColor(INK_FAINT)
      .fontSize(8)
      .font("Helvetica")
      .text(`DNI ${p.dni} · ${p.tipoAsiento}`, 66, rowY0 + 14, { width: nombreWidth, lineBreak: false });

    if (p.esResponsable) {
      doc
        .fillColor("#92400E")
        .fontSize(7)
        .font("Helvetica-Bold")
        // "★" (U+2605) tampoco existe en WinAnsiEncoding — mismo problema
        // que la flecha de arriba, se mostraba como "&". "•" (bullet,
        // U+2022) sí está en esa tabla de caracteres.
        .text("• RESPONSABLE", 32 + pageWidth - 92, rowY0 + 2, { width: 92, align: "right" });
    }

    doc.y = rowY0 + rowH;
    doc
      .moveTo(32, doc.y)
      .lineTo(32 + pageWidth, doc.y)
      .strokeColor(LINE)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.25);
  });

  // Mini-mapa de ubicación — al margen de que la numeración de la butaca
  // pueda no coincidir con la del coche real que finalmente sale, esto
  // ubica el lugar por posición física (fila, lado, piso). Solo se dibuja
  // el/los piso(s) donde el grupo realmente tiene butacas.
  const numerosSuperior = new Set(pasajeros.filter((p) => p.tipoAsiento === "Semi-Cama").map((p) => p.asiento));
  const numerosInferior = new Set(pasajeros.filter((p) => p.tipoAsiento === "Cama").map((p) => p.asiento));
  if (numerosSuperior.size > 0 || numerosInferior.size > 0) {
    doc.moveDown(0.2);
    doc
      .fillColor(INK_FAINT)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("UBICACIÓN EN EL COCHE", 32, doc.y, { width: pageWidth, align: "center", characterSpacing: 0.5 });
    doc.moveDown(0.15);

    const ambosPisos = numerosSuperior.size > 0 && numerosInferior.size > 0;
    const mapaY = doc.y;
    doc.fillColor(INK_FAINT).fontSize(6).font("Helvetica-Bold").text("FRENTE", 32, mapaY, { width: pageWidth, align: "center" });
    let alturaUsada = 10;

    if (ambosPisos) {
      const cxSup = 32 + pageWidth / 4;
      const cxInf = 32 + (pageWidth * 3) / 4;
      const sup = drawFloorMiniMap(doc, SUPERIOR_ROWS, numerosSuperior, cxSup, mapaY + 9);
      const inf = drawFloorMiniMap(doc, INFERIOR_ROWS, numerosInferior, cxInf, mapaY + 9);
      alturaUsada = 9 + Math.max(sup.height, inf.height) + 9;
      doc.fillColor(INK_FAINT).fontSize(6.5).font("Helvetica-Bold").text("PISO SUPERIOR", 32, mapaY + 9 + sup.height + 1, {
        width: pageWidth / 2,
        align: "center",
      });
      doc.fillColor(INK_FAINT).fontSize(6.5).font("Helvetica-Bold").text("PISO INFERIOR", 32 + pageWidth / 2, mapaY + 9 + inf.height + 1, {
        width: pageWidth / 2,
        align: "center",
      });
    } else {
      const rows = numerosSuperior.size > 0 ? SUPERIOR_ROWS : INFERIOR_ROWS;
      const numeros = numerosSuperior.size > 0 ? numerosSuperior : numerosInferior;
      const m = drawFloorMiniMap(doc, rows, numeros, 32 + pageWidth / 2, mapaY + 9);
      alturaUsada = 9 + m.height + 9;
    }

    doc.y = mapaY + alturaUsada;
    doc
      .fillColor(INK_FAINT)
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("FONDO", 32, doc.y, { width: pageWidth, align: "center" });
    doc.moveDown(0.15);
  }

  doc.moveDown(0.1);
  // Misma lógica defensiva que las filas de pasajeros: cada línea usa una
  // coordenada Y explícita relativa a `rowY`, en vez de encadenar .text()
  // que dependan de dónde quedó el cursor de la llamada anterior — así no
  // importa si "PRECIO TOTAL" y "EMITIDO" tienen distinto alto de línea.
  const colWidth = pageWidth / 2;
  const rowY = doc.y;
  doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("PRECIO TOTAL", 32, rowY);
  doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text(fmtMoney(precioTotal), 32, rowY + 12);
  doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("EMITIDO", 32 + colWidth, rowY);
  doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text(
    new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    32 + colWidth,
    rowY + 12,
  );
  doc.y = rowY + 26;

  // Adicionales
  if (hotel || asistencia || (obsData && obsData.length > 0)) {
    // Nunca se muestran datos de contacto del hotel/asistencia acá — son
    // proveedores de la agencia, no del pasajero; solo interesa el nombre
    // (y, si aplica, el tipo de habitación reservado).
    if (hotel) {
      const y0 = doc.y;
      doc.rect(32, y0, pageWidth, 24).fillColor("#F4F5F7").fill();
      doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("HOTEL INCLUIDO", 42, y0 + 6);
      doc
        .fillColor(INK)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(`${hotel.nombre}${habitacionLabel ? " · Habitación " + habitacionLabel : ""}`, 42, y0 + 14);
      doc.y = y0 + 24 + 8;
    }
    if (asistencia) {
      const y0 = doc.y;
      doc.rect(32, y0, pageWidth, 24).fillColor("#F4F5F7").fill();
      doc.fillColor(INK_FAINT).fontSize(7).font("Helvetica-Bold").text("ASISTENCIA AL VIAJERO INCLUIDA", 42, y0 + 6);
      doc.fillColor(INK).fontSize(9).font("Helvetica-Bold").text(asistencia.nombre, 42, y0 + 14);
      doc.y = y0 + 24 + 8;
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
    // x/width explícitos: sin esto, pdfkit centra el texto a partir de
    // donde haya quedado el cursor tras la fila PRECIO TOTAL/EMITIDO de
    // arriba (32 + colWidth), no desde el margen — por eso se veía
    // corrido hacia la derecha en vez de centrado en toda la página.
    doc
      .fillColor(INK_FAINT)
      .fontSize(8)
      .font("Helvetica-Oblique")
      .text("Este servicio no incluye adicionales — solo el pasaje.", 32, doc.y, { width: pageWidth, align: "center" });
  }

  doc.moveDown(0.4);
  doc
    .moveTo(32, doc.y)
    .lineTo(32 + pageWidth, doc.y)
    .dash(3, { space: 2 })
    .strokeColor("#DDE1E6")
    .stroke();
  doc.undash();
  doc.moveDown(0.5);

  // QR + validación — x/width explícitos en cada .text() centrado: no
  // confiar en dónde haya quedado el cursor de la llamada anterior (la
  // misma causa del bug de alineación de más arriba).
  //
  // Salto de página manual: pdfkit pagina solo los .text() que no entran,
  // pero NO las imágenes (.image()) — sin este chequeo, un voucher con
  // varios pasajeros y adicionales podía dejar el QR cortado a la mitad al
  // borde de la hoja, con el código y la leyenda huérfanos en una página
  // aparte. Se reserva el alto real de todo el bloque antes de dibujarlo.
  const qrSize = 96;
  const altoBloqueQr = 12 + 6 + qrSize + 8 + 14 + 4 + 20;
  if (doc.y + altoBloqueQr > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
  doc
    .fillColor(INK_FAINT)
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("VALIDACIÓN DE LA RESERVA", 32, doc.y, { width: pageWidth, align: "center", characterSpacing: 0.5 });
  doc.moveDown(0.3);
  const qrX = 32 + pageWidth / 2 - qrSize / 2;
  doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
  doc.y += qrSize + 8;
  doc
    .fillColor(INK)
    .fontSize(10)
    .font("Courier-Bold")
    .text(reserva.codigo_validacion || "—", 32, doc.y, { width: pageWidth, align: "center" });
  doc.moveDown(0.2);
  doc
    .fillColor(INK_FAINT)
    .fontSize(7.5)
    .font("Helvetica")
    .text("Al escanear se abre la página con los datos de la reserva, para validarla.", 32, doc.y, {
      width: pageWidth,
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
