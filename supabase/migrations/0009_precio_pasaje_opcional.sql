-- Un servicio se puede crear sin precio definido todavía — el precio real se
-- carga recién al vender cada asiento (útil cuando el precio no está cerrado
-- al momento de armar la salida). reserva_pasajeros.precio sigue siendo
-- obligatorio: para cuando existe una venta, sí o sí hay un precio real.
alter table servicios alter column precio_pasaje drop not null;
