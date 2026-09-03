"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ACCENT = "#2E6E8E";

// 120 min de inactividad total; el aviso aparece 2 min antes de cerrar sesión.
const INACTIVIDAD_MS = 120 * 60 * 1000;
const AVISO_ANTES_MS = 2 * 60 * 1000;

const EVENTOS_ACTIVIDAD = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

/**
 * Cierra la sesión sola después de `INACTIVIDAD_MS` sin ninguna interacción
 * del usuario (mouse, teclado, scroll, touch) — para que una compu
 * desatendida en la agencia no quede con la sesión abierta para siempre.
 * Se monta una sola vez en el layout de cada área logueada.
 */
export function InactivityGuard() {
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function limpiarTimers() {
      if (avisoTimer.current) clearTimeout(avisoTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    }

    async function cerrarPorInactividad() {
      limpiarTimers();
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login?motivo=inactividad";
    }

    function iniciarAviso() {
      setMostrarAviso(true);
      setSegundosRestantes(Math.round(AVISO_ANTES_MS / 1000));
      countdownInterval.current = setInterval(() => {
        setSegundosRestantes((s) => Math.max(s - 1, 0));
      }, 1000);
    }

    function resetear() {
      limpiarTimers();
      setMostrarAviso(false);
      avisoTimer.current = setTimeout(iniciarAviso, INACTIVIDAD_MS - AVISO_ANTES_MS);
      logoutTimer.current = setTimeout(cerrarPorInactividad, INACTIVIDAD_MS);
    }

    // `mousemove`/`scroll` disparan decenas de veces por segundo — no tiene
    // sentido recrear los timers en cada uno, alcanza con hacerlo una vez
    // cada pocos segundos para considerar que "hubo actividad reciente".
    let ultimoReset = 0;
    function onActividad() {
      const ahora = Date.now();
      if (ahora - ultimoReset < 5000) return;
      ultimoReset = ahora;
      resetear();
    }

    // Cualquier actividad reinicia el conteo, incluso con el aviso ya
    // mostrado — no hace falta tocar "Seguir conectado" a propósito, con
    // mover el mouse o tipear alcanza (igual que en un banco online).
    resetear();
    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, onActividad, { passive: true }));

    return () => {
      limpiarTimers();
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, onActividad));
    };
  }, []);

  function seguirConectado() {
    setMostrarAviso(false);
  }

  if (!mostrarAviso) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="text-[15px] font-extrabold text-ink">Tu sesión va a cerrarse</div>
        <p className="mt-2 text-[13px] text-ink-soft">
          Por seguridad, si no hay actividad se cierra sola. Te quedan{" "}
          <span className="font-bold text-ink">
            {minutos}:{String(segundos).padStart(2, "0")}
          </span>
          .
        </p>
        <button
          onClick={seguirConectado}
          style={{ background: ACCENT }}
          className="mt-5 w-full rounded-[10px] py-2.5 text-[13px] font-bold text-white"
        >
          Seguir conectado
        </button>
      </div>
    </div>
  );
}
