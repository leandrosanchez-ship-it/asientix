// Helpers de formato compartidos — se aplican en el borde de escritura (server
// actions), así todo lo que se guarda en la base ya queda limpio y cualquier
// pantalla que lo lea después (voucher, WhatsApp, listados) no tiene que
// repetir la limpieza.

/** DNI sin puntos, sin espacios — "30.123.456" y "30123456" guardan igual. */
export function limpiarDni(dni: string): string {
  return dni.replace(/[.\s]/g, "").trim();
}

/**
 * Normaliza un teléfono argentino a formato E.164 listo para WhatsApp:
 * "+549" + código de área (sin el 0 nacional) + número (sin el 15 de celular).
 * El "15" argentino se escribe pegado al código de área (ej. "0351 15
 * 555-0000"), y como no sabemos el largo exacto del código de área en un
 * campo de texto libre, probamos los largos típicos (2 a 4 dígitos).
 */
export function formatTelefonoWhatsapp(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";

  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);

  if (d.startsWith("0")) d = d.slice(1);

  for (const largoArea of [2, 3, 4]) {
    if (d.slice(largoArea, largoArea + 2) === "15") {
      d = d.slice(0, largoArea) + d.slice(largoArea + 2);
      break;
    }
  }

  return d ? `+549${d}` : "";
}

/** Mismo número que formatTelefonoWhatsapp pero sin el "+" — lo que espera wa.me. */
export function digitsWhatsapp(raw: string): string {
  return formatTelefonoWhatsapp(raw).replace("+", "");
}

/**
 * Parsea un monto en formato argentino ("$ 45.000", "45.000,50", "45000")
 * donde el punto es separador de miles y la coma es decimal — a diferencia
 * de Number(), que interpretaría "45.000" como 45.
 */
export function parseArsMoney(raw: string): number {
  const limpio = raw.replace(/[^\d.,]/g, "");
  if (!limpio) return 0;
  const normalizado = limpio.replace(/\./g, "").replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}
