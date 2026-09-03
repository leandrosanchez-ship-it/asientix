import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo: branding */}
      <div
        className="hidden w-[460px] shrink-0 flex-col justify-between p-11 text-white md:flex"
        style={{ background: "linear-gradient(160deg, #2e6e8e 0%, #16201d 100%)" }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-white/[.18]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="6" width="18" height="12" rx="3" />
                <circle cx="8" cy="18" r="1.6" />
                <circle cx="16" cy="18" r="1.6" />
                <path d="M3 11h18" />
              </svg>
            </span>
            <span className="font-display text-[17px] font-extrabold">Asientix</span>
          </div>
          <div className="ml-11 mt-1 text-xs text-white/65">
            Desarrollado por Assertix Software
          </div>
        </div>

        <div>
          <div className="max-w-[320px] font-display text-[26px] font-extrabold leading-[1.25]">
            Vender un pasaje, cobrarlo y avisarle al pasajero — todo desde una sola
            pantalla.
          </div>
          <div className="mt-[18px] max-w-[320px] text-[13px] leading-relaxed text-white/70">
            Tu acceso lo crea Assertix o el administrador de tu agencia — no hay
            registro abierto. Si todavía no tenés usuario, pedíselo a quien administra
            tu cuenta.
          </div>
        </div>

        <div className="text-[11px] text-white/45">© 2026 Assertix Software</div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex flex-1 items-center justify-center bg-app px-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
