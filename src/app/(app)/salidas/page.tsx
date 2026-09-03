import Link from "next/link";
import { SERVICIOS, generarAsientosDemo } from "@/lib/mock-data";

// TODO: reemplazar por `select * from servicios where agencia_id = ...`
// (RLS ya deja pasar solo los de la agencia del usuario logueado) ordenado
// por fecha, y `select estado, count(*) from asientos where servicio_id = ...`
// para la ocupación de cada card.

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatFecha(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SalidasPage() {
  const servicios = SERVICIOS.map((servicio) => {
    const { asientos } = generarAsientosDemo(servicio.id);
    const vendidos = asientos.filter((a) => a.estado !== "libre").length;
    return { servicio, vendidos, total: asientos.length };
  });

  return (
    <div>
      <div className="flex items-start justify-between px-8 pt-8">
        <div>
          <h1 className="font-display text-[22px] font-extrabold text-ink">
            Próximas salidas
          </h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            Elegí un servicio para ver y cargar el mapa de asientos.
          </p>
        </div>
        <Link
          href="/servicios/nuevo"
          className="whitespace-nowrap rounded-[10px] bg-accent px-[18px] py-2.5 text-[13px] font-bold text-white"
        >
          + Nuevo servicio
        </Link>
      </div>

      <div className="flex flex-col gap-3.5 px-8 py-6">
        {servicios.map(({ servicio, vendidos, total }) => {
          const pct = Math.round((vendidos / total) * 100);
          return (
            <div
              key={servicio.id}
              className="flex items-center justify-between gap-6 rounded-[14px] border border-line bg-white px-6 py-5"
            >
              <div className="flex-[1.4]">
                <div className="text-base font-bold text-ink">
                  {servicio.origen} → {servicio.destino}
                </div>
                <div className="mt-0.5 text-[13px] text-ink-soft">
                  {formatFecha(servicio.fecha)} · {servicio.hora} hs ·{" "}
                  {servicio.tipoCoche}
                </div>
              </div>
              <div className="w-[220px]">
                <div className="mb-1.5 text-xs text-ink-soft">
                  {vendidos} / {total} vendidos
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F2]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <Link
                href={`/servicios/${servicio.id}`}
                className="whitespace-nowrap rounded-[10px] border border-accent px-[18px] py-2.5 text-[13px] font-bold text-accent"
              >
                Ver mapa de asientos →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
