"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Agencia, Pantalla, Rol, Usuario } from "@/lib/types";
import { crearAgencia, crearUsuario, actualizarUsuario } from "./actions";
import { LogoutButton } from "@/components/LogoutButton";
import { Toast } from "@/components/Toast";

const ACCENT = "#2E6E8E";

const PANTALLAS: { value: Pantalla; label: string }[] = [
  { value: "salidas", label: "Salidas" },
  { value: "clientes", label: "Clientes" },
  { value: "cobros", label: "Cobros" },
  { value: "caja", label: "Caja" },
  { value: "reportes", label: "Reportes" },
  { value: "tareas", label: "Tareas" },
  { value: "mensajes", label: "Mensajes" },
  { value: "proveedores", label: "Proveedores" },
];

function generarPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function Check({ checked }: { checked: boolean }) {
  return checked ? (
    <span
      className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px]"
      style={{ background: ACCENT }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  ) : (
    <span className="h-[15px] w-[15px] shrink-0 rounded-[4px] border-[1.5px] border-[#C7CBD1]" />
  );
}

interface UserForm {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  permisos: Pantalla[];
}

function emptyForm(): UserForm {
  return { nombre: "", email: "", password: generarPassword(), rol: "vendedor", permisos: [] };
}

export function SuperadminClient({
  agencias,
  usuarios,
}: {
  agencias: Agencia[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedAgencia, setSelectedAgencia] = useState<string | null>(agencias[0]?.id ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());

  const [agModalOpen, setAgModalOpen] = useState(false);
  const [agForm, setAgForm] = useState({ nombre: "", ciudad: "" });

  const agenciaActual = agencias.find((a) => a.id === selectedAgencia) ?? agencias[0];
  const usuariosAgencia = useMemo(
    () => usuarios.filter((u) => u.agenciaId === agenciaActual?.id),
    [usuarios, agenciaActual],
  );

  function openCreate() {
    setModalMode("create");
    setModalUserId(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function openEdit(u: Usuario) {
    setModalMode("edit");
    setModalUserId(u.id);
    setForm({ nombre: u.nombre, email: u.email, password: "", rol: u.rol === "superadmin" ? "admin" : u.rol, permisos: u.permisos });
    setError(null);
    setModalOpen(true);
  }

  function togglePermiso(p: Pantalla) {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(p) ? prev.permisos.filter((x) => x !== p) : [...prev.permisos, p],
    }));
  }

  function saveUser() {
    if (!agenciaActual) return;
    setError(null);
    startTransition(async () => {
      try {
        if (modalMode === "create") {
          await crearUsuario({
            agenciaId: agenciaActual.id,
            nombre: form.nombre,
            email: form.email,
            password: form.password,
            rol: form.rol,
            permisos: form.permisos,
          });
          setToast(`✓ Usuario creado — ya puede iniciar sesión con "${form.email}" y la contraseña que le diste.`);
        } else if (modalUserId) {
          await actualizarUsuario({
            usuarioId: modalUserId,
            nombre: form.nombre,
            email: form.email,
            rol: form.rol,
            permisos: form.permisos,
          });
          setToast("✓ Usuario actualizado.");
        }
        setModalOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  function saveAgencia() {
    setError(null);
    startTransition(async () => {
      try {
        await crearAgencia(agForm);
        setToast(`✓ Agencia "${agForm.nombre}" creada.`);
        setAgModalOpen(false);
        setAgForm({ nombre: "", ciudad: "" });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      }
    });
  }

  const isAdmin = form.rol === "admin";
  const canSaveUser = !!form.nombre && !!form.email && (modalMode === "edit" || !!form.password);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <div className="flex items-center justify-between px-8 py-3.5 text-white" style={{ background: "#14201D" }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/[.14]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="3" />
              <circle cx="8" cy="18" r="1.6" />
              <circle cx="16" cy="18" r="1.6" />
              <path d="M3 11h18" />
            </svg>
          </span>
          <div>
            <div className="font-display text-sm font-extrabold">Asientix</div>
            <div className="mt-px text-[10px] text-white/55">Panel de administración · Assertix Software</div>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="rounded-full bg-white/[.12] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide">
            Superadmin · Assertix
          </span>
          <LogoutButton className="rounded-lg border border-white/25 px-3 py-1.5 text-[11px] font-semibold text-white/85 hover:bg-white/10" />
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="px-8 pt-[26px]">
        <h1 className="font-display text-[20px] font-extrabold text-ink">Agencias y usuarios</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Assertix es el único superadmin: acá se da de alta cada agencia y se crean todos sus usuarios — no hay registro propio.
        </p>
      </div>

      <div className="flex items-start gap-5 px-8 py-[22px]">
        <div className="flex w-[300px] shrink-0 flex-col gap-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            Agencias ({agencias.length})
          </div>
          {agencias.map((ag) => {
            const active = ag.id === agenciaActual?.id;
            return (
              <button
                key={ag.id}
                onClick={() => setSelectedAgencia(ag.id)}
                className="flex flex-col gap-1 rounded-xl border px-4 py-3.5 text-left"
                style={{
                  borderColor: active ? ACCENT : "#E3E5EA",
                  background: active ? ACCENT : "#fff",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-bold" style={{ color: active ? "#fff" : "#1C1F27" }}>
                    {ag.nombre}
                  </span>
                  <span className="h-2 w-2 rounded-full" style={{ background: "#22C55E" }} />
                </div>
                <span className="text-[11.5px]" style={{ color: active ? "rgba(255,255,255,.8)" : "#6B7280" }}>
                  {ag.ciudad || "—"}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setAgModalOpen(true)}
            className="rounded-xl border border-dashed border-[#C7CBD1] px-4 py-3.5 text-left text-[12.5px] font-bold text-ink-soft"
          >
            + Agregar nueva agencia
          </button>
        </div>

        {agenciaActual ? (
          <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-6 py-[18px]">
              <div>
                <div className="text-[15px] font-extrabold text-ink">{agenciaActual.nombre}</div>
                <div className="mt-0.5 text-xs text-ink-soft">{agenciaActual.ciudad || "—"}</div>
              </div>
              <button
                onClick={openCreate}
                style={{ background: ACCENT }}
                className="rounded-[9px] px-4 py-2.5 text-[12.5px] font-bold text-white"
              >
                + Nuevo usuario
              </button>
            </div>

            <div
              className="grid gap-2 border-b border-line bg-[#F4F5F7] px-6 py-[11px]"
              style={{ gridTemplateColumns: "1.6fr 1.8fr 0.9fr 1.6fr 0.8fr" }}
            >
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Nombre</div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Email</div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Rol</div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Pantallas habilitadas</div>
              <div />
            </div>

            {usuariosAgencia.map((u) => {
              const esAdmin = u.rol === "admin";
              return (
                <div
                  key={u.id}
                  className="grid items-center gap-2 border-b border-[#EEF0F2] px-6 py-3.5"
                  style={{ gridTemplateColumns: "1.6fr 1.8fr 0.9fr 1.6fr 0.8fr" }}
                >
                  <div className="text-[13px] font-semibold text-ink">{u.nombre}</div>
                  <div className="text-[12.5px] text-ink-soft">{u.email}</div>
                  <div>
                    <span
                      className="rounded-full px-[9px] py-1 text-[10px] font-bold"
                      style={{
                        background: esAdmin ? "#DCFCE7" : "#EFF6FF",
                        color: esAdmin ? "#15803D" : "#1D4ED8",
                      }}
                    >
                      {esAdmin ? "Admin" : "Vendedor"}
                    </span>
                  </div>
                  <div className="text-xs text-[#4B5563]">
                    {esAdmin ? "Todas" : `${u.permisos.length} de ${PANTALLAS.length}`}
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-[7px] border border-line bg-white px-[11px] py-1.5 text-[11px] font-bold text-ink"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
            {usuariosAgencia.length === 0 && (
              <div className="px-6 py-6 text-[13px] text-ink-soft">Esta agencia todavía no tiene usuarios.</div>
            )}

            <div className="px-6 py-3 text-[11.5px] text-ink-faint">
              Los usuarios <b>admin</b> ven automáticamente las {PANTALLAS.length} pantallas de Asientix; a los{" "}
              <b>vendedor</b> se les habilita pantalla por pantalla.
            </div>
          </div>
        ) : (
          <div className="flex-1 rounded-2xl border border-line bg-white p-6 text-[13px] text-ink-soft">
            Todavía no hay agencias cargadas — agregá la primera con &quot;+ Agregar nueva agencia&quot;.
          </div>
        )}
      </div>

      {agModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(15,23,42,0.45)] px-4 py-12">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-7">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="font-display text-[17px] font-extrabold text-ink">Nueva agencia</h2>
              <button onClick={() => setAgModalOpen(false)} className="text-ink-soft">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-1 text-xs text-ink-soft">Nombre</div>
                <input
                  value={agForm.nombre}
                  onChange={(e) => setAgForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Sequeira Tours"
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-ink-soft">Ciudad</div>
                <input
                  value={agForm.ciudad}
                  onChange={(e) => setAgForm((p) => ({ ...p, ciudad: e.target.value }))}
                  placeholder="Ej. Villa Carlos Paz, Córdoba"
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-accent"
                />
              </div>
            </div>
            {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setAgModalOpen(false)}
                className="rounded-[10px] border border-line px-[18px] py-2.5 text-[13px] font-semibold text-ink"
              >
                Cancelar
              </button>
              <button
                onClick={saveAgencia}
                disabled={!agForm.nombre || isPending}
                style={{ background: ACCENT }}
                className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                {isPending ? "Creando…" : "Crear agencia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(15,23,42,0.45)] px-4 py-12">
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white p-7">
            <div className="mb-[18px] flex items-start justify-between">
              <h2 className="font-display text-[17px] font-extrabold text-ink">
                {modalMode === "create" ? "Nuevo usuario" : "Editar usuario"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-ink-soft">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs text-ink-soft">Nombre y apellido</div>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full rounded-lg border border-line px-2.5 py-2.5 text-[13px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-ink-soft">Email</div>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nombre@agencia.com"
                  className="w-full rounded-lg border border-line px-2.5 py-2.5 text-[13px] outline-none focus:border-accent"
                />
              </div>
            </div>

            {modalMode === "create" && (
              <div className="mt-3">
                <div className="mb-1 text-xs text-ink-soft">Contraseña inicial</div>
                <div className="flex gap-2">
                  <input
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full rounded-lg border border-line px-2.5 py-2.5 text-[13px] outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, password: generarPassword() }))}
                    className="whitespace-nowrap rounded-lg border border-line px-3 text-xs font-bold text-ink-soft"
                  >
                    Regenerar
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-ink-faint">Copiala antes de guardar — se la pasás al usuario para su primer ingreso.</div>
              </div>
            )}

            <div className="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              Rol
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setForm((p) => ({ ...p, rol: "admin" }))}
                style={isAdmin ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E3E5EA", color: "#6B7280" }}
                className="flex-1 rounded-[9px] border px-2.5 py-2.5 text-[12.5px] font-bold"
              >
                Admin — ve todo
              </button>
              <button
                onClick={() => setForm((p) => ({ ...p, rol: "vendedor" }))}
                style={!isAdmin ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E3E5EA", color: "#6B7280" }}
                className="flex-1 rounded-[9px] border px-2.5 py-2.5 text-[12.5px] font-bold"
              >
                Vendedor — pantallas elegidas
              </button>
            </div>

            {!isAdmin && (
              <>
                <div className="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
                  Pantallas habilitadas para este usuario
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PANTALLAS.map((p) => {
                    const checked = form.permisos.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        onClick={() => togglePermiso(p.value)}
                        className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left"
                      >
                        <Check checked={checked} />
                        <span className="text-[12.5px] text-ink">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {error && <div className="mt-4 text-xs font-semibold text-red-600">{error}</div>}

            <div className="mt-[26px] flex justify-end gap-2.5">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-[10px] border border-line px-[18px] py-2.5 text-[13px] font-semibold text-ink"
              >
                Cancelar
              </button>
              <button
                onClick={saveUser}
                disabled={!canSaveUser || isPending}
                style={{ background: ACCENT }}
                className="rounded-[10px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-55"
              >
                {isPending ? "Guardando…" : modalMode === "create" ? "Crear usuario" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
