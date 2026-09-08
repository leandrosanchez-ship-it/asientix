/**
 * Monograma de Asientix: la "A" con el travesaño hecho de dos butacas —
 * una libre, una ocupada — el mismo gesto del mapa de asientos, adentro de
 * la inicial de la marca. Une los conceptos 02 (grilla de asientos) y 03
 * (monograma A) que se compararon al diseñarlo.
 *
 * `variant="onAccent"`: "A" blanca — para usar sobre el color de marca
 * (badge del NavBar, panel de login, favicon). `variant="onLight"`: "A" en
 * el color de marca — para usar sobre fondos claros.
 */
export function AsientixIcon({
  size = 20,
  variant = "onAccent",
}: {
  size?: number;
  variant?: "onAccent" | "onLight";
}) {
  const bodyColor = variant === "onAccent" ? "#FFFFFF" : "#16808F";
  const asientoLibre = variant === "onAccent" ? "#16808F" : "#F3F7F6";

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 6 8 40h7.2l3-6.6h11.6l3 6.6H40L24 6Z" fill={bodyColor} />
      <rect x="18.5" y="24" width="5" height="6" rx="1.6" fill={asientoLibre} />
      <rect x="24.5" y="24" width="5" height="6" rx="1.6" fill="#0F5A66" />
    </svg>
  );
}
