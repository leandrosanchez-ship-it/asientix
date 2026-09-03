"use client";

import { useEffect } from "react";

/**
 * Notificación flotente reutilizada en toda la app (Superadmin, Cobros,
 * Reportes, Mensajes, Mapa de asientos) — antes cada pantalla la armaba a
 * mano y se quedaba pegada en pantalla para siempre. Se cierra sola después
 * de `duration`, y siempre tiene una × para cerrarla a mano también.
 * El color se infiere del mensaje (✕ al principio = error, si no, éxito) —
 * así los `setToast(...)` existentes no necesitan cambiar de firma.
 */
export function Toast({
  message,
  onClose,
  duration = 4500,
  className = "mx-8 mt-4",
}: {
  message: string;
  onClose: () => void;
  duration?: number;
  /** Márgenes/posición del contenedor — por defecto el margen de página estándar. */
  className?: string;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, duration]);

  const isError = message.trim().startsWith("✕");
  const bg = isError ? "#FEE2E2" : "#DCFCE7";
  const border = isError ? "#F8C6C6" : "#BBF0CE";
  const fg = isError ? "#B91C1C" : "#15803D";

  return (
    <div
      className={`${className} flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-xs font-bold`}
      style={{ background: bg, borderColor: border, color: fg }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="shrink-0 text-base leading-none opacity-70 hover:opacity-100"
      >
        &times;
      </button>
    </div>
  );
}
