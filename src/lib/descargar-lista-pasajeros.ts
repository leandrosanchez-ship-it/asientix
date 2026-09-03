import { generarListaPasajerosPdf, type GenerarListaPasajerosInput } from "@/app/(app)/reportes/actions";

/**
 * Mismo patrón que descargar-boleto.ts: pide el PDF real al server y dispara
 * la descarga en el navegador.
 */
export async function descargarListaPasajerosPdf(input: GenerarListaPasajerosInput): Promise<string> {
  const { base64, filename } = await generarListaPasajerosPdf(input);

  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return filename;
}
