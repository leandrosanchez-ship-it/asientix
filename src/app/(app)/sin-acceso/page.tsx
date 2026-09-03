export default function SinAccesoPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <div className="text-lg font-extrabold text-ink">No tenés pantallas habilitadas</div>
      <p className="mt-2 max-w-md text-[13px] text-ink-soft">
        Tu usuario todavía no tiene ninguna pantalla asignada. Pedile al administrador de tu
        agencia que te habilite el acceso desde el panel de Superadmin.
      </p>
    </div>
  );
}
