-- El cobro al cerrar una reserva ahora pregunta cómo se pagó (antes nunca se
-- registraba ningún pago al finalizar el wizard de reserva) — si es efectivo,
-- además hace falta saber en qué moneda.
alter table pagos
  add column moneda text check (moneda in ('ARS', 'USD'));

comment on column pagos.moneda is 'Solo aplica cuando medio_pago = ''efectivo''; null para transferencia/tarjeta.';
