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

- ✅ Esquema de base de datos (`supabase/migrations/0001_init.sql`)
- ✅ Auth + `/login` (Supabase Auth, coincide con el diseño de `Login.dc.html`)
- ✅ `/salidas` y `/servicios/[id]` (Mapa de Asientos, reserva grupal con asistente) —
  con datos de ejemplo, todavía sin Supabase conectado
- ✅ Proyecto Vercel enlazado y conectado al repo de GitHub; dominio propio en curso
- ⏳ Resto de las pantallas (Clientes, Alta de servicio, Proveedores, Cobros,
  Reportes, Mensajes, Boleto, Caja diaria, Cancelaciones, Superadmin) — en
  construcción, siguiendo la maqueta en `../mockup/pantallas/`.
