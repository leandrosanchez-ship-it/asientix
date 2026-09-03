-- Agrega un tercer estado para poder distinguir, en la pantalla de
-- Cancelar/Reprogramar, si un pasajero salió de su asiento porque se
-- canceló o porque se lo reprogramó a otro servicio.
alter table reserva_pasajeros drop constraint reserva_pasajeros_estado_check;
alter table reserva_pasajeros
  add constraint reserva_pasajeros_estado_check check (estado in ('activo', 'cancelado', 'reprogramado'));
