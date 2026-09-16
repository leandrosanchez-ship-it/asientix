-- Tanda grande de mejoras operativas pedidas por el cliente (archivo
-- "Asientix.txt" del 2026-09-16). Todo aditivo — nada rompe filas existentes.

-- ─────────────────────────────────────────────────────────────────────────
-- Servicios: moneda del pasaje, cantidad de habitaciones, excursión
-- ─────────────────────────────────────────────────────────────────────────
alter table servicios
  add column moneda text not null default 'ARS' check (moneda in ('ARS','USD')),
  add column cantidad_habitaciones integer,
  add column incluye_excursion boolean not null default false,
  add column excursion_observaciones text not null default '';

-- ─────────────────────────────────────────────────────────────────────────
-- Hoteles: dirección (se imprime en el voucher)
-- ─────────────────────────────────────────────────────────────────────────
alter table hoteles add column direccion text not null default '';

-- ─────────────────────────────────────────────────────────────────────────
-- Asistencia al viajero: tope de cobertura (moneda + importe)
-- ─────────────────────────────────────────────────────────────────────────
alter table asistencias_viajero
  add column tope_cobertura_moneda text check (tope_cobertura_moneda in ('ARS','USD')),
  add column tope_cobertura_monto numeric(12,2);

-- ─────────────────────────────────────────────────────────────────────────
-- Nuevos proveedores: Coordinador y Transporte (mismo patrón que
-- hoteles/asistencias_viajero — se cargan una vez, se eligen por servicio)
-- ─────────────────────────────────────────────────────────────────────────
create table coordinadores (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  nombre      text not null,
  apellido    text not null,
  telefono    text not null default '',
  created_at  timestamptz not null default now()
);

create table transportes (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  nombre      text not null,
  contacto    text not null default '',
  created_at  timestamptz not null default now()
);

alter table servicios
  add column coordinador_id uuid references coordinadores(id),
  add column transporte_id  uuid references transportes(id);

alter table coordinadores enable row level security;
alter table transportes enable row level security;

create policy coordinadores_tenant_all on coordinadores for all
  using (auth_es_superadmin() or agencia_id = auth_agencia_id())
  with check (auth_es_superadmin() or agencia_id = auth_agencia_id());
create policy transportes_tenant_all on transportes for all
  using (auth_es_superadmin() or agencia_id = auth_agencia_id())
  with check (auth_es_superadmin() or agencia_id = auth_agencia_id());

-- ─────────────────────────────────────────────────────────────────────────
-- Tipos de habitación ampliados
-- ─────────────────────────────────────────────────────────────────────────
alter table reservas drop constraint reservas_habitacion_tipo_check;
alter table reservas add constraint reservas_habitacion_tipo_check
  check (habitacion_tipo in (
    'single','doble','triple','cuadruple',
    'matrimonial','matrimonial_1','matrimonial_2','quintuple'
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- Reservas: régimen de comida (se pregunta al vender, no al alta del
-- servicio) y qué vendedor hizo la venta (para reportes "ventas por
-- vendedor")
-- ─────────────────────────────────────────────────────────────────────────
alter table reservas
  add column regimen_comida text check (regimen_comida in ('desayuno','media_pension','pension_completa')),
  add column vendedor_id uuid references usuarios(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────
-- Reserva_pasajeros: punto de embarque (reemplaza a "localidad" en el
-- reporte/voucher, se carga por pasajero al momento de reservar)
-- ─────────────────────────────────────────────────────────────────────────
alter table reserva_pasajeros add column embarque text not null default '';
