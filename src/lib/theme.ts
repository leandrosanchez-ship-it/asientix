// Color de marca de Asientix — "Teal con más vida" (2026-09-06, elegido por
// el cliente entre 3 opciones). Vivía duplicado como `const ACCENT = "#..."`
// en cada Client Component; ahora hay un solo lugar para cambiarlo. Mantener
// en sync con `--accent` en globals.css (esa variable maneja las clases de
// Tailwind — bg-accent, text-accent, border-accent — este valor crudo es
// para estilos inline dinámicos y para pdfkit, que no puede leer variables
// CSS al generar un PDF en el servidor).
export const ACCENT = "#16808F";
