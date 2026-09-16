import type { TipoHabitacion } from "./types";

/**
 * Única fuente de verdad para los tipos de habitación — antes estaba
 * duplicado (y desalineado) en SeatDetailModal.tsx, boleto.ts y la página
 * de verificación pública. Agregar un tipo nuevo se hace acá una sola vez.
 */
export const HABITACION_LABELS: Record<TipoHabitacion, string> = {
  single: "single",
  doble: "doble",
  triple: "triple",
  cuadruple: "cuádruple",
  matrimonial: "matrimonial",
  matrimonial_1: "matrimonial + 1",
  matrimonial_2: "matrimonial + 2",
  quintuple: "quíntuple",
};

export const HABITACIONES: { value: TipoHabitacion; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "doble", label: "Doble" },
  { value: "triple", label: "Triple" },
  { value: "cuadruple", label: "Cuádruple" },
  { value: "matrimonial", label: "Matrimonial" },
  { value: "matrimonial_1", label: "Matrimonial + 1" },
  { value: "matrimonial_2", label: "Matrimonial + 2" },
  { value: "quintuple", label: "Quíntuple" },
];

export function habitacionLabel(tipo: string | null): string | null {
  if (!tipo) return null;
  return HABITACION_LABELS[tipo as TipoHabitacion] ?? tipo;
}
