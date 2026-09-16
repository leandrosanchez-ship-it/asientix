import type { RegimenComida } from "./types";

export const REGIMEN_LABELS: Record<RegimenComida, string> = {
  desayuno: "Desayuno",
  media_pension: "Media pensión",
  pension_completa: "Pensión completa",
};

export const REGIMENES: { value: RegimenComida; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "media_pension", label: "Media pensión" },
  { value: "pension_completa", label: "Pensión completa" },
];

export function regimenLabel(regimen: string | null): string | null {
  if (!regimen) return null;
  return REGIMEN_LABELS[regimen as RegimenComida] ?? regimen;
}
