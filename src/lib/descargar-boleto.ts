import { generarBoletoPdf } from "@/app/actions/boleto";

/**
 * Pide el PDF real del boleto al server (generarBoletoPdf) y dispara la
 * descarga en el navegador. Devuelve el nombre de archivo para mostrar en
 * un toast de confirmación.
 */
export async function descargarBoletoPdf(reservaPasajeroId: string): Promise<string> {
  const { base64, filename } = await generarBoletoPdf({ reservaPasajeroId });

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
