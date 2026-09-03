-- Asientix — esquema inicial
-- Multi-tenant: cada tabla operativa lleva agencia_id y queda aislada por Row Level
-- Security (nunca solo por UI). El superadmin (Assertix) no tiene agencia_id: ve todo.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Agencias y usuarios
-- ─────────────────────────────────────────────────────────────────────────

create table agencias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  ciudad      text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Un usuario = una fila en auth.users (Supabase Auth) + su perfil acá.
-- rol 'superadmin' -> agencia_id NULL, ve y administra todas las agencias.
-- rol 'admin'      -> ve todas las pantallas de SU agencia.
-- rol 'vendedor'   -> ve solo las pantallas listadas en `permisos`.
create table usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  agencia_id  uuid references agencias(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  rol         text not null check (rol in ('superadmin','admin','vendedor')),
  permisos    text[] not null default '{}',  -- ej. {'salidas','cobros','mensajes'} — ignorado si rol <> 'vendedor'
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint usuarios_agencia_requerida check (
    (rol = 'superadmin' and agencia_id is null) or
    (rol <> 'superadmin' and agencia_id is not null)
  )
);

-- Funciones helper (SECURITY DEFINER: evitan recursión de RLS al consultar
-- la propia tabla `usuarios` desde dentro de una policy de `usuarios`).
create function auth_agencia_id() returns uuid
  language sql security definer stable
  set search_path = public
  as $$ select agencia_id from usuarios where id = auth.uid() $$;

create function auth_rol() returns text
  language sql security definer stable
  set search_path = public
  as $$ select rol from usuarios where id = auth.uid() $$;

create function auth_es_superadmin() returns boolean
  language sql security definer stable
  set search_path = public
  as $$ select coalesce(auth_rol() = 'superadmin', false) $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Proveedores y observaciones (se cargan una vez, se reutilizan en Servicios)
-- ─────────────────────────────────────────────────────────────────────────

create table hoteles (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  nombre      text not null,
  contacto    text,
  telefono    text,
  created_at  timestamptz not null default now()
);

create table asistencias_viajero (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  nombre      text not null,
  contacto    text,
  telefono    text,
  created_at  timestamptz not null default now()
);

create table observaciones (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  titulo      text not null,
  texto       text not null,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Clientes (base de datos reutilizable entre servicios)
-- ─────────────────────────────────────────────────────────────────────────

create table clientes (
  id              uuid primary key default gen_random_uuid(),
  agencia_id      uuid not null references agencias(id) on delete cascade,
  nombre          text not null,
  apellido        text not null,
  dni             text,
  nacimiento      date,
  telefono        text,
  email           text,
  localidad       text,
  emer_nombre     text,
  emer_telefono   text,
  emer_parentesco text,
  obra_social     text,
  obra_social_nro text,
  created_at      timestamptz not null default now()
);
create index clientes_agencia_dni_idx on clientes (agencia_id, dni);
create index clientes_agencia_apellido_idx on clientes (agencia_id, apellido, nombre);

-- ─────────────────────────────────────────────────────────────────────────
-- Servicios (salidas) y asientos
-- ─────────────────────────────────────────────────────────────────────────

create table servicios (
  id                          uuid primary key default gen_random_uuid(),
  agencia_id                  uuid not null references agencias(id) on delete cascade,
  origen                      text not null,
  destino                     text not null,
  fecha                       date not null,
  hora                        time not null,
  tipo_coche                  text not null,
  unidad                      text,
  precio_pasaje               numeric(12,2) not null,
  incluye_hotel               boolean not null default false,
  hotel_id                    uuid references hoteles(id),
  tipos_habitacion_disponibles text[] not null default '{}', -- subset de {'single','doble','triple','cuadruple'}
  incluye_asistencia          boolean not null default false,
  asistencia_id               uuid references asistencias_viajero(id),
  observaciones_ids           uuid[] not null default '{}',
  created_at                  timestamptz not null default now()
);

-- Numeración real de doble piso (ver Main.dc.html): superior 10-55+59-60 (48),
-- inferior 1-9+56-58 (12) — se generan al crear el servicio, no son correlativos.
create table asientos (
  id          uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios(id) on delete cascade,
  numero      integer not null,
  piso        text not null check (piso in ('superior','inferior')),
  estado      text not null default 'libre' check (estado in ('libre','ocupado','pendiente')),
  created_at  timestamptz not null default now(),
  unique (servicio_id, numero)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Reservas (1 responsable + N asientos -> 1 voucher) y pasajeros
-- ─────────────────────────────────────────────────────────────────────────

create table reservas (
  id               uuid primary key default gen_random_uuid(),
  agencia_id       uuid not null references agencias(id) on delete cascade,
  servicio_id      uuid not null references servicios(id) on delete cascade,
  habitacion_tipo  text check (habitacion_tipo in ('single','doble','triple','cuadruple')),
  codigo_validacion text unique, -- string corto para el QR del voucher
  created_at       timestamptz not null default now()
);

create table reserva_pasajeros (
  id               uuid primary key default gen_random_uuid(),
  reserva_id       uuid not null references reservas(id) on delete cascade,
  asiento_id       uuid not null references asientos(id) on delete cascade,
  cliente_id       uuid not null references clientes(id),
  es_responsable   boolean not null default false,
  precio           numeric(12,2) not null,
  created_at       timestamptz not null default now(),
  unique (asiento_id)
);
create index reserva_pasajeros_reserva_idx on reserva_pasajeros (reserva_id);

create table pagos (
  id                    uuid primary key default gen_random_uuid(),
  reserva_pasajero_id   uuid not null references reserva_pasajeros(id) on delete cascade,
  monto                 numeric(12,2) not null,
  medio_pago            text not null check (medio_pago in ('efectivo','transferencia','tarjeta')),
  fecha                 timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create table eventos_reserva (
  id            uuid primary key default gen_random_uuid(),
  reserva_id    uuid not null references reservas(id) on delete cascade,
  usuario_id    uuid references usuarios(id),
  accion        text not null check (accion in ('creada','cancelada','reprogramada','pago_registrado')),
  motivo        text,
  detalle       jsonb,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Tareas (Kanban) y Mensajes (plantillas)
-- ─────────────────────────────────────────────────────────────────────────

create table tareas (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  titulo      text not null,
  fecha       date not null,
  estado      text not null default 'pendiente' check (estado in ('pendiente','en_progreso','finalizada')),
  created_at  timestamptz not null default now()
);

create table mensajes_plantillas (
  id          uuid primary key default gen_random_uuid(),
  agencia_id  uuid not null references agencias(id) on delete cascade,
  tipo        text not null check (tipo in ('saldo','viaje','cumple','promo')),
  texto       text not null,
  created_at  timestamptz not null default now(),
  unique (agencia_id, tipo)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table agencias enable row level security;
alter table usuarios enable row level security;
alter table hoteles enable row level security;
alter table asistencias_viajero enable row level security;
alter table observaciones enable row level security;
alter table clientes enable row level security;
alter table servicios enable row level security;
alter table asientos enable row level security;
alter table reservas enable row level security;
alter table reserva_pasajeros enable row level security;
alter table pagos enable row level security;
alter table eventos_reserva enable row level security;
alter table tareas enable row level security;
alter table mensajes_plantillas enable row level security;

-- agencias: superadmin ve/crea todas; el resto solo ve la propia.
create policy agencias_superadmin_all on agencias for all
  using (auth_es_superadmin()) with check (auth_es_superadmin());
create policy agencias_propia_select on agencias for select
  using (id = auth_agencia_id());

-- usuarios: superadmin administra todos; cada usuario puede leer su propia fila
-- (para saber su rol/permisos al loguearse) pero no la de otros.
create policy usuarios_superadmin_all on usuarios for all
  using (auth_es_superadmin()) with check (auth_es_superadmin());
create policy usuarios_propia_select on usuarios for select
  using (id = auth.uid());

-- Tablas simples con agencia_id directo: superadmin ve todo, cada agencia solo lo suyo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'hoteles','asistencias_viajero','observaciones','clientes',
    'servicios','reservas','tareas','mensajes_plantillas'
  ]
  loop
    execute format(
      'create policy %I_tenant_all on %I for all using (auth_es_superadmin() or agencia_id = auth_agencia_id()) with check (auth_es_superadmin() or agencia_id = auth_agencia_id());',
      t, t
    );
  end loop;
end $$;

-- Tablas sin agencia_id propio: se resuelve vía join al padre.
create policy asientos_tenant_all on asientos for all
  using (
    auth_es_superadmin() or
    exists (select 1 from servicios s where s.id = asientos.servicio_id and s.agencia_id = auth_agencia_id())
  )
  with check (
    auth_es_superadmin() or
    exists (select 1 from servicios s where s.id = asientos.servicio_id and s.agencia_id = auth_agencia_id())
  );

create policy reserva_pasajeros_tenant_all on reserva_pasajeros for all
  using (
    auth_es_superadmin() or
    exists (select 1 from reservas r where r.id = reserva_pasajeros.reserva_id and r.agencia_id = auth_agencia_id())
  )
  with check (
    auth_es_superadmin() or
    exists (select 1 from reservas r where r.id = reserva_pasajeros.reserva_id and r.agencia_id = auth_agencia_id())
  );

create policy pagos_tenant_all on pagos for all
  using (
    auth_es_superadmin() or
    exists (
      select 1 from reserva_pasajeros rp
      join reservas r on r.id = rp.reserva_id
      where rp.id = pagos.reserva_pasajero_id and r.agencia_id = auth_agencia_id()
    )
  )
  with check (
    auth_es_superadmin() or
    exists (
      select 1 from reserva_pasajeros rp
      join reservas r on r.id = rp.reserva_id
      where rp.id = pagos.reserva_pasajero_id and r.agencia_id = auth_agencia_id()
    )
  );

create policy eventos_reserva_tenant_all on eventos_reserva for all
  using (
    auth_es_superadmin() or
    exists (select 1 from reservas r where r.id = eventos_reserva.reserva_id and r.agencia_id = auth_agencia_id())
  )
  with check (
    auth_es_superadmin() or
    exists (select 1 from reservas r where r.id = eventos_reserva.reserva_id and r.agencia_id = auth_agencia_id())
  );
