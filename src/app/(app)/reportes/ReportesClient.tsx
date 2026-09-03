"use client";

import { useState } from "react";
import { Toast } from "@/components/Toast";
import { descargarListaPasajerosPdf } from "@/lib/descargar-lista-pasajeros";

const ACCENT = "#2E6E8E";

export interface Movimiento {
  fecha: string; // dd/mm/yyyy, para mostrar
  fechaOrden: string; // ISO, para ordenar
  pasajero: string;
  servicio: string;
  monto: number;
  medio: string;
}

export interface MesData {
  total: number;
  pasajes: number;
  servicios: number;
  rutas: { nombre: string; monto: number; pct: number }[];
  movimientos: Movimiento[];
}

export interface ServicioOption {
  id: string;
  label: string;
  destino: string;
  fecha: string;
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

type Plantilla = "coordinador" | "colectivo" | "hotel";

const COLUMN_DEFS: { key: string; label: string }[] = [
  { key: "nombre", label: "Nombre" },
  { key: "apellido", label: "Apellido" },
  { key: "dni", label: "DNI" },
  { key: "telefono", label: "Teléfono" },
  { key: "asiento", label: "Asiento" },
  { key: "emergencia", label: "Contacto de emergencia" },
  { key: "localidad", label: "Localidad" },
  { key: "obraSocial", label: "Obra social" },
];

const PLANTILLA_LABELS: Record<Plantilla, string> = {
  coordinador: "Coordinador",
  colectivo: "Colectivo",
  hotel: "Hotel",
};

const COLUMNAS_DEFAULT: Record<Plantilla, string[]> = {
  coordinador: ["nombre", "apellido", "dni", "telefono", "asiento", "emergencia", "localidad", "obraSocial"],
  colectivo: ["nombre", "apellido", "dni"],
  hotel: ["nombre", "apellido", "dni", "telefono", "localidad"],
};

function TabPlantilla({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { background: ACCENT, borderColor: ACCENT, color: "#fff" } : { borderColor: "#E3E5EA", color: "#6B7280" }}
      className="rounded-full border bg-white px-4 py-2 text-xs font-bold"
    >
      {children}
    </button>
  );
}

function Check({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]" style={{ background: ACCENT }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  ) : (
    <span className="h-4 w-4 shrink-0 rounded-[4px] border-[1.5px] border-[#C7CBD1]" />
  );
}

export function ReportesClient({
  porMes,
  mesesOptions,
  serviciosOptions,
}: {
  porMes: Record<string, MesData>;
  mesesOptions: { value: string; label: string }[];
  serviciosOptions: ServicioOption[];
}) {
  const [mes, setMes] = useState(mesesOptions[0]?.value ?? "");
  const [plantilla, setPlantilla] = useState<Plantilla>("coordinador");
  const [columnasPorPlantilla, setColumnasPorPlantilla] = useState(COLUMNAS_DEFAULT);
  const [servicioExport, setServicioExport] = useState(serviciosOptions[0]?.id ?? "");
  const [exportToast, setExportToast] = useState<string | null>(null);

  const d: MesData = porMes[mes] ?? { total: 0, pasajes: 0, servicios: 0, rutas: [], movimientos: [] };
  const ticketProm = d.pasajes > 0 ? d.total / d.pasajes : 0;

  const columnasActivas = columnasPorPlantilla[plantilla];

  function toggleColumna(key: string) {
    setColumnasPorPlantilla((prev) => {
      const actuales = prev[plantilla];
      const nuevas = actuales.includes(key) ? actuales.filter((k) => k !== key) : [...actuales, key];
      return { ...prev, [plantilla]: nuevas };
    });
  }

  function exportar() {
    const servicio = serviciosOptions.find((s) => s.id === servicioExport);
    if (!servicio) return;
    setExportToast("Generando PDF…");
    descargarListaPasajerosPdf({ servicioId: servicio.id, plantilla, columnas: columnasActivas })
      .then((filename) => setExportToast(`✓ Se descargó ${filename}`))
      .catch((e) => setExportToast(`✕ No se pudo generar el PDF: ${e instanceof Error ? e.message : "error"}`));
  }

  const hayDatos = mesesOptions.length > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between px-8 pt-7">
        <div>
          <h1 className="font-display text-[22px] font-extrabold text-ink">Reportes</h1>
          <p className="mt-1 text-[13px] text-ink-soft">Facturación e histórico de movimientos, mes a mes.</p>
        </div>
        {hayDatos && (
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Mes</div>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-[13px] font-semibold outline-none focus:border-accent"
            >
              {mesesOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!hayDatos ? (
        <div className="mx-8 mt-6 rounded-2xl border border-line bg-white px-6 py-11 text-center text-[13px] text-ink-soft">
          Todavía no hay servicios con ventas registradas — los reportes aparecen apenas se cargue la primera salida con pasajeros.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3.5 px-8 pt-[22px]">
            <KpiCard label="Total facturado" value={fmt(d.total)} />
            <KpiCard label="Pasajes vendidos" value={String(d.pasajes)} />
            <KpiCard label="Servicios realizados" value={String(d.servicios)} />
            <KpiCard label="Ticket promedio" value={fmt(ticketProm)} />
          </div>

          <div className="flex items-start gap-5 px-8 pt-[22px]">
            <div className="flex-1 rounded-2xl border border-line bg-white p-[22px]">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Facturación por ruta</div>
              {d.rutas.map((r) => (
                <div key={r.nombre} className="mb-3.5">
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <div className="font-semibold text-ink">{r.nombre}</div>
                    <div className="text-ink-soft">{fmt(r.monto)}</div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF0F2]">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: ACCENT }} />
                  </div>
                </div>
              ))}
              {d.rutas.length === 0 && <div className="text-[13px] text-ink-faint">Sin ventas este mes.</div>}
            </div>

            <div className="flex-[1.4] overflow-hidden rounded-2xl border border-line bg-white">
              <div className="border-b border-line px-5 py-[18px]">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Histórico de movimientos</div>
              </div>
              <div className="grid grid-cols-[1fr_1.6fr_1.6fr_1fr_1.1fr] gap-2 border-b border-line bg-app px-5 py-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Fecha</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Pasajero</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Servicio</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Monto</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Medio</div>
              </div>
              {d.movimientos.map((mov, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.6fr_1.6fr_1fr_1.1fr] items-center gap-2 border-b border-[#EEF0F2] px-5 py-3 text-[13px]">
                  <div className="text-[#4B5563]">{mov.fecha}</div>
                  <div className="font-semibold text-ink">{mov.pasajero}</div>
                  <div className="text-[#4B5563]">{mov.servicio}</div>
                  <div className="font-bold text-ink">{fmt(mov.monto)}</div>
                  <div className="text-[#4B5563]">{mov.medio}</div>
                </div>
              ))}
              {d.movimientos.length === 0 && (
                <div className="px-5 py-11 text-center text-[13px] text-ink-faint">Sin movimientos este mes.</div>
              )}
            </div>
          </div>
        </>
      )}

      {serviciosOptions.length > 0 && (
        <div className="px-8 py-[22px]">
          <div className="rounded-2xl border border-line bg-white p-[22px]">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              Emitir PDF
            </div>
            <div className="mb-4 max-w-[620px] text-[13px] text-ink-soft">
              Un PDF por servicio con quién va en cada asiento. Elegí qué plantilla usar y qué columnas incluir — cada
              destinatario ve solo lo que necesita.
            </div>

            <div className="mb-[18px] flex gap-2">
              <TabPlantilla active={plantilla === "coordinador"} onClick={() => setPlantilla("coordinador")}>
                Coordinador
              </TabPlantilla>
              <TabPlantilla active={plantilla === "colectivo"} onClick={() => setPlantilla("colectivo")}>
                Colectivo
              </TabPlantilla>
              <TabPlantilla active={plantilla === "hotel"} onClick={() => setPlantilla("hotel")}>
                Hotel
              </TabPlantilla>
            </div>

            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
              Columnas de {PLANTILLA_LABELS[plantilla]}
            </div>
            <div className="mb-5 grid grid-cols-4 gap-x-4 gap-y-2.5">
              {COLUMN_DEFS.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumna(col.key)}
                  className="flex items-center gap-2 bg-none p-0 text-left"
                >
                  <Check checked={columnasActivas.includes(col.key)} />
                  <span className="text-[12.5px] font-medium text-ink">{col.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-5 border-t border-[#EEF0F2] pt-4">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Servicio</div>
                <select
                  value={servicioExport}
                  onChange={(e) => setServicioExport(e.target.value)}
                  className="min-w-[320px] rounded-lg border border-line bg-white px-3.5 py-2.5 text-[13px] font-semibold outline-none focus:border-accent"
                >
                  {serviciosOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={exportar}
                style={{ background: ACCENT }}
                className="whitespace-nowrap rounded-lg px-[18px] py-2.5 text-[13px] font-bold text-white"
              >
                Descargar PDF
              </button>
            </div>
            {exportToast && <Toast message={exportToast} onClose={() => setExportToast(null)} className="mt-4" />}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-[18px]">
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1.5 text-[21px] font-extrabold text-ink">{value}</div>
    </div>
  );
}
