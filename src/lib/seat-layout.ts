/**
 * Disposición física real del coche (misma que en el mockup original,
 * Main.dc.html) — numeración no correlativa, respeta la que ya usa la
 * agencia. Única fuente de verdad: la usan tanto SeatMap.tsx (mapa
 * interactivo) como boleto.ts (mini-mapa de ubicación en el voucher impreso)
 * y la página pública de verificación, para que los tres coincidan siempre.
 */
export type SeatCell =
  | { type: "seat"; numero: number; wide?: boolean }
  | { type: "amenity"; label: string; wide?: boolean }
  | { type: "gap" };

const s = (numero: number): SeatCell => ({ type: "seat", numero });
const sw = (numero: number): SeatCell => ({ type: "seat", numero, wide: true });
const a = (label: string, wide = false): SeatCell => ({ type: "amenity", label, wide });
const g = (): SeatCell => ({ type: "gap" });

export const SUPERIOR_ROWS: SeatCell[][] = [
  [s(13), s(12), g(), s(10), s(11)],
  [s(15), s(14), g(), a("Escalera", true)],
  [s(17), s(16), g(), a("Café", true)],
  [s(19), s(18), g(), s(20), s(21)],
  [s(23), s(22), g(), s(24), s(25)],
  [s(27), s(26), g(), s(28), s(29)],
  [s(31), s(30), g(), s(32), s(33)],
  [s(35), s(34), g(), s(36), s(37)],
  [s(39), s(38), g(), s(40), s(41)],
  [s(43), s(42), g(), s(44), s(45)],
  [s(47), s(46), g(), s(48), s(49)],
  [s(51), s(50), g(), s(52), s(53)],
  [s(55), s(54), g(), s(60), s(59)],
];

export const INFERIOR_ROWS: SeatCell[][] = [
  [a("Puerta", true), g(), a("", true)],
  [a("TV", true), g(), a("Puerta", true)],
  [s(1), s(2), g(), sw(3)],
  [s(4), s(5), g(), sw(6)],
  [s(7), s(8), g(), sw(9)],
  [s(57), s(58), g(), sw(56)],
];
