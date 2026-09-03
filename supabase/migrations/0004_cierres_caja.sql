-- Arqueo diario de caja (pantalla "Caja"). Un cierre por agencia y día —
-- "Cerrar caja" hace upsert, así que rehacer el arqueo el mismo día
-- simplemente actualiza el cierre existente en vez de duplicarlo.
create table cierres_caja (
  id                uuid primary key default gen_random_uuid(),
  agencia_id        uuid not null references agencias(id) on delete cascade,
  fecha             date not null,
  efectivo_esperado numeric(12,2) not null,
  efectivo_contado  numeric(12,2) not null,
  diferencia        numeric(12,2) not null,
  usuario_id        uuid references usuarios(id),
  created_at        timestamptz not null default now(),
  unique (agencia_id, fecha)
);

alter table cierres_caja enable row level security;

create policy cierres_caja_tenant_all on cierres_caja for all
  using (auth_es_superadmin() or agencia_id = auth_agencia_id())
  with check (auth_es_superadmin() or agencia_id = auth_agencia_id());

-- No hace falta GRANT manual acá: las migraciones 0002/0003 ya dejaron
-- ALTER DEFAULT PRIVILEGES para que las tablas nuevas hereden el acceso
-- de service_role/authenticated automáticamente.
