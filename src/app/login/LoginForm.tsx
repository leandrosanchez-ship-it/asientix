"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Completá email y contraseña para continuar.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-[380px]">
      <h1 className="text-2xl font-extrabold font-display text-ink">Iniciar sesión</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Ingresá con el usuario y contraseña que te dieron.
      </p>

      {error && (
        <div className="mt-[18px] rounded-[9px] border border-bad-border bg-bad-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-bad-ink">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mt-6">
          <label className="mb-1 block text-xs text-ink-soft" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@agencia.com"
            className="w-full rounded-[9px] border border-line px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-ink-soft" htmlFor="password">
              Contraseña
            </label>
            <span className="cursor-pointer text-[11.5px] font-semibold text-accent">
              ¿Olvidaste tu contraseña?
            </span>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-[9px] border border-line px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-[10px] bg-accent py-3 text-[13.5px] font-bold text-accent-ink disabled:opacity-60"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <div className="mt-[26px] border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-faint">
        No hay alta de cuenta propia: los usuarios (administradores y vendedores) los
        crea el superadmin de Assertix desde el panel de administración. Cada agencia
        ve únicamente sus propios datos.
      </div>
    </div>
  );
}
