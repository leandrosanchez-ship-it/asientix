-- Superadmin ahora puede borrar un usuario (antes solo se podía editar).
-- eventos_reserva.usuario_id y cierres_caja.usuario_id no tenían "on delete"
-- definido -> por default es NO ACTION, así que borrar un usuario con
-- historial (un evento de reserva o un cierre de caja a su nombre) hubiera
-- fallado con una violación de foreign key. El historial en sí (qué pasó,
-- cuándo, con qué números) importa más que quién lo hizo — se pone en NULL,
-- no se borra la fila del historial.

alter table eventos_reserva
  drop constraint eventos_reserva_usuario_id_fkey,
  add constraint eventos_reserva_usuario_id_fkey
    foreign key (usuario_id) references usuarios(id) on delete set null;

alter table cierres_caja
  drop constraint cierres_caja_usuario_id_fkey,
  add constraint cierres_caja_usuario_id_fkey
    foreign key (usuario_id) references usuarios(id) on delete set null;
