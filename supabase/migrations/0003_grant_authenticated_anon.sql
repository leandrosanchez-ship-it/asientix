-- Mismo problema que 0002 pero para los roles `authenticated` y `anon`:
-- el proyecto se creó sin los GRANT por default de Supabase, así que
-- CUALQUIER select/insert vía el cliente normal (anon key + sesión de
-- usuario) fallaba con "permission denied for table X" (42501) — esto es
-- lo que hacía que getCurrentUser() SIEMPRE devolviera null (el select a
-- `usuarios` fallaba en silencio) y todo terminara redirigiendo a /login
-- sin importar que el login en sí funcionara bien.
--
-- RLS sigue siendo quien de verdad restringe qué filas ve cada quien; este
-- GRANT solo habilita el acceso a nivel tabla que Postgres exige además de
-- eso.
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all routines in schema public to authenticated;

-- anon solo necesita poder ejecutar las funciones de auth helper si algún
-- día se llaman antes de loguearse; no le damos acceso a tablas.
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant all on routines to authenticated;
