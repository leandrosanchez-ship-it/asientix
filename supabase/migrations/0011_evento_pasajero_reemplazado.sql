-- Nuevo tipo de evento para el historial de una reserva: reemplazar quién
-- ocupa una butaca ya vendida por otra persona (mismo asiento, mismo precio,
-- mismo historial de pagos — solo cambia el cliente_id).
alter table eventos_reserva drop constraint eventos_reserva_accion_check;
alter table eventos_reserva add constraint eventos_reserva_accion_check
  check (accion in ('creada','cancelada','reprogramada','pago_registrado','pasajero_reemplazado'));
