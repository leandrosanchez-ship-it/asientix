# Asientix — webapp

Código real de **Asientix**, desarrollado por **Assertix Software**. Next.js (App
Router) + Supabase + Vercel, 100% web — ver `../tecnico/asientix-blueprint.html`
para la arquitectura completa y `../propuesta/` para el alcance funcional acordado
con Sequeira Tours (cliente piloto).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **Supabase** (Postgres + Auth) — aislamiento multi-agencia por Row Level Security,
  esquema en `supabase/migrations/`
- **Vercel** — deploy automático en cada push a `main`, proyecto `asientix` bajo
  la cuenta `leandrosanchez-ship-it`, dominio `asientix.com.ar` (comprado en NIC.ar,
  conectado vía registros A a Vercel)

## Poner en marcha

```bash
npm install
cp .env.local.example .env.local   # completar con los datos del proyecto Supabase
npm run dev                         # http://localhost:3002
```

### Base de datos

`supabase/migrations/0001_init.sql` tiene el esquema inicial completo (agencias,
usuarios/roles/permisos, proveedores, servicios, asientos, reservas, pagos, tareas,
mensajes) con las políticas de Row Level Security ya definidas. Aplicarlo desde el
SQL Editor del proyecto Supabase, o con la Supabase CLI (`supabase db push`) una vez
que el proyecto esté linkeado.

## Modelo de usuarios (ver Blueprint para el detalle completo)

- **superadmin** (Assertix): sin `agencia_id`, ve y administra todas las agencias.
  Único que puede dar de alta agencias y usuarios — no hay registro propio.
- **admin**: ve todas las pantallas de su agencia.
- **vendedor**: ve solo las pantallas listadas en su columna `permisos`, elegidas
  por el superadmin al crear el usuario.

## Estado

- ✅ Esquema de base de datos (`supabase/migrations/`), con `service_role` y
  `authenticated` correctamente `GRANT`eados (ver 0002/0003 — sin esto cualquier
  select/insert vía RLS falla en silencio pese a políticas correctas)
- ✅ Auth + `/login` (Supabase Auth real, coincide con el diseño de `Login.dc.html`)
- ✅ `/superadmin` — alta de agencias/usuarios reales (fuera del layout de agencia)
- ✅ Proveedores, Nuevo servicio, Salidas, `/servicios/[id]` (Mapa de Asientos +
  reserva grupal + marcar pagado) — **conectados a Supabase real**, verificados
  end-to-end (crear servicio → reservar → pagar → persistido en la base)
- ✅ Producción: `https://asientix.com.ar`, env vars reales en Vercel, deploy
  automático en cada push a `main`
- ⏳ Resto de las pantallas (Clientes, Cobros/Cobros pendientes, Reportes, Tareas,
  Mensajes, Boleto real en PDF, Caja diaria, Cancelaciones) — siguiendo la maqueta
  en `../mockup/pantallas/`.
