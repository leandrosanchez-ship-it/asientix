// Sin este archivo, Next.js no tiene ningún límite de Suspense alrededor
// del contenido de cada pantalla — al navegar (o al hacer router.refresh()
// después de guardar algo), la pantalla ANTERIOR se queda tal cual, sin
// ningún indicio visual, hasta que el server termina de armar la nueva
// página entera. Eso es lo que se sentía como "queda congelada": no es que
// no pasara nada, es que no había ninguna señal de que sí estaba pasando.
// Este esqueleto se muestra al toque en cuanto se hace clic, así el cambio
// de pantalla se ve instantáneo aunque la carga de datos tarde lo mismo.
export default function AppLoading() {
  return (
    <div className="animate-pulse px-8 py-7">
      <div className="h-6 w-56 rounded-md bg-[#E3E5EA]" />
      <div className="mt-2.5 h-3.5 w-80 rounded bg-[#EEF0F2]" />

      <div className="mt-7 grid grid-cols-4 gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[74px] rounded-2xl border border-line bg-white" />
        ))}
      </div>

      <div className="mt-5 h-64 rounded-2xl border border-line bg-white" />
    </div>
  );
}
