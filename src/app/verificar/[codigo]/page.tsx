import { createAdminClient } from "@/lib/supabase/admin";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const HABITACION_LABELS: Record<string, string> = {
  single: "single",
  doble: "doble",
  triple: "triple",
  cuadruple: "cuádruple",
};

function fechaLarga(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// Página pública — la abre cualquiera que escanee el QR del boleto (chofer,
// control de acceso), sin cuenta ni sesión. Por eso usa el cliente admin
// (bypassea RLS) pero solo expone lo necesario para confirmar que la
// reserva es válida y qué incluye — nunca DNI, teléfono ni montos: eso es
// dato del pasajero/de la agencia, no algo para mostrar en una página abierta
// a cualquiera que tenga el link.
export default async function VerificarPage({ params }: PageProps<"/verificar/[codigo]">) {
  const { codigo } = await params;
  const supabase = createAdminClient();

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, servicio_id, habitacion_tipo, codigo_validacion")
    .eq("codigo_validacion", codigo)
    .limit(1)
    .maybeSingle();

  if (!reserva) {
    return (
      <Shell>
        <div className="text-2xl">✕</div>
        <h1 className="mt-2 text-lg font-extrabold text-[#B91C1C]">Código no encontrado</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Este código de validación no corresponde a ninguna reserva. Puede haber un error al escanear o la reserva
          fue eliminada.
        </p>
      </Shell>
    );
  }

  const { data: servicio } = await supabase
    .from("servicios")
    .select("origen, destino, fecha, hora, unidad, agencia_id, hotel_id, asistencia_id, observaciones_ids")
    .eq("id", reserva.servicio_id)
    .single();

  if (!servicio) {
    return (
      <Shell>
        <div className="text-2xl">✕</div>
        <h1 className="mt-2 text-lg font-extrabold text-[#B91C1C]">Servicio no encontrado</h1>
      </Shell>
    );
  }

  const [{ data: agencia }, { data: grupoRp }, { data: hotel }, { data: asistencia }, { data: obsData }] =
    await Promise.all([
      supabase.from("agencias").select("nombre").eq("id", servicio.agencia_id).single(),
      supabase
        .from("reserva_pasajeros")
        .select("id, asiento_id, cliente_id, es_responsable")
        .eq("reserva_id", reserva.id)
        .eq("estado", "activo")
        .order("es_responsable", { ascending: false }),
      servicio.hotel_id
        ? supabase.from("hoteles").select("nombre").eq("id", servicio.hotel_id).single()
        : Promise.resolve({ data: null }),
      servicio.asistencia_id
        ? supabase.from("asistencias_viajero").select("nombre").eq("id", servicio.asistencia_id).single()
        : Promise.resolve({ data: null }),
      servicio.observaciones_ids?.length > 0
        ? supabase.from("observaciones").select("titulo, texto").in("id", servicio.observaciones_ids)
        : Promise.resolve({ data: [] }),
    ]);

  const grupo = grupoRp ?? [];
  const asientoIds = grupo.map((g) => g.asiento_id);
  const clienteIds = grupo.map((g) => g.cliente_id);
  const [{ data: asientosData }, { data: clientesData }] = await Promise.all([
    asientoIds.length > 0
      ? supabase.from("asientos").select("id, numero, piso").in("id", asientoIds)
      : Promise.resolve({ data: [] }),
    clienteIds.length > 0
      ? supabase.from("clientes").select("id, nombre, apellido").in("id", clienteIds)
      : Promise.resolve({ data: [] }),
  ]);
  const asientoPorId = new Map((asientosData ?? []).map((a) => [a.id, a]));
  const clientePorId = new Map((clientesData ?? []).map((c) => [c.id, c]));

  const pasajeros = grupo
    .map((g) => {
      const cliente = clientePorId.get(g.cliente_id);
      const asiento = asientoPorId.get(g.asiento_id);
      if (!cliente || !asiento) return null;
      return {
        nombre: `${cliente.apellido}, ${cliente.nombre}`,
        asiento: asiento.numero as number,
        tipoAsiento: asiento.piso === "superior" ? "Semi-Cama" : "Cama",
        esResponsable: g.es_responsable as boolean,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.asiento - b.asiento);

  const habitacionLabel = reserva.habitacion_tipo
    ? (HABITACION_LABELS[reserva.habitacion_tipo] ?? reserva.habitacion_tipo)
    : null;

  return (
    <Shell>
      <div
        className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
        style={{ background: "#DCFCE7", color: "#15803D" }}
      >
        ✓ Reserva válida
      </div>
      <h1 className="text-lg font-extrabold text-ink">
        {servicio.origen} → {servicio.destino}
      </h1>
      <p className="mt-0.5 text-sm text-ink-soft">
        {fechaLarga(servicio.fecha)} · {(servicio.hora ?? "").slice(0, 5)} hs
        {servicio.unidad ? ` · ${servicio.unidad}` : ""}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{agencia?.nombre ?? "Asientix"}</p>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          Pasajeros ({pasajeros.length})
        </div>
        <div className="flex flex-col gap-2">
          {pasajeros.map((p) => (
            <div key={p.asiento} className="flex items-center justify-between rounded-lg border border-line bg-[#F7F8F7] px-3 py-2">
              <div>
                <div className="text-[13px] font-semibold text-ink">{p.nombre}</div>
                <div className="text-[11px] text-ink-faint">
                  Asiento {p.asiento} · {p.tipoAsiento}
                  {p.esResponsable ? " · Responsable de la reserva" : ""}
                </div>
              </div>
            </div>
          ))}
          {pasajeros.length === 0 && (
            <div className="text-[13px] text-ink-faint">Sin pasajeros activos en esta reserva.</div>
          )}
        </div>
      </div>

      {(hotel || asistencia || (obsData && obsData.length > 0)) && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Incluye</div>
          <div className="flex flex-col gap-2">
            {hotel && (
              <div className="rounded-lg bg-[#F4F5F7] px-3 py-2 text-[13px]">
                <span className="font-bold text-ink">Hotel:</span> {hotel.nombre}
                {habitacionLabel ? ` · Habitación ${habitacionLabel}` : ""}
              </div>
            )}
            {asistencia && (
              <div className="rounded-lg bg-[#F4F5F7] px-3 py-2 text-[13px]">
                <span className="font-bold text-ink">Asistencia al viajero:</span> {asistencia.nombre}
              </div>
            )}
            {(obsData ?? []).map((o) => (
              <div key={o.titulo} className="rounded-lg bg-[#F4F5F7] px-3 py-2 text-[13px]">
                <span className="font-bold text-ink">{o.titulo}:</span> {o.texto}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-line pt-3 text-center text-[11px] text-ink-faint">
        Código {reserva.codigo_validacion}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[#F3F7F6] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-sm">{children}</div>
    </div>
  );
}
