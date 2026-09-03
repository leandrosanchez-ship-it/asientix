-- Soporta cancelar/reprogramar un pasajero sin perder su historial: en vez
-- de borrar la fila de reserva_pasajeros, se marca 'cancelado' (el asiento
-- vuelve a 'libre' aparte) y queda disponible para mostrar en la pantalla
-- de Cancelar/Reprogramar. Todas las pantallas que cuentan "pasajeros
-- vendidos" (mapa de asientos, clientes, cobros, reportes, mensajes) deben
-- filtrar por estado = 'activo'.
alter table reserva_pasajeros
  add column estado text not null default 'activo' check (estado in ('activo', 'cancelado'));
