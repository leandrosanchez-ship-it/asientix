-- El proyecto se creó sin los GRANT por default que Supabase suele aplicar
-- a `service_role` sobre el schema `public` (confirmado en runtime: selects/
-- inserts directos vía supabase-js con la service role key daban
-- "permission denied for table X", código 42501, con el propio Postgres
-- sugiriendo este GRANT). `service_role` ya tiene BYPASSRLS a nivel rol,
-- pero sin estos GRANT igual no puede tocar las tablas.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

-- Para que las tablas/objetos creados por migraciones futuras hereden esto
-- automáticamente y no volvamos a pisar el mismo problema.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;
