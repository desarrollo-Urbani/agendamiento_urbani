# Urbani Smart Scheduling

Sistema de agendamiento inmobiliario con backend Node.js + PostgreSQL (Supabase), frontend React (Vite), auditoria de eventos y control de acceso por roles.

## Funcionalidades principales

- Gestion de proyectos, calendario y citas.
- Auditoria de acciones clave (vistas y modificaciones).
- Roles de acceso: `admin`, `usuario`, `lector`.
- Panel de administracion de usuarios en Supabase Auth (solo admin).
- Filtro de visibilidad por rol (lectura/gestion segun permisos).

## Requisitos

- Node.js 18+
- npm 9+
- Base de datos PostgreSQL accesible por `DATABASE_URL`

## Configuracion local

1. Instalar dependencias

```bash
npm install
npm run frontend:install
```

2. Crear archivo de entorno local

Usa `.env.example` como base y crea tu `.env` local.

Variables importantes:

- `DATABASE_URL`
- `CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_AUDIENCE`
- `ONLY_ALLOWED_EMAIL`

Nota: no publiques archivos `.env` con claves reales.

## Levantar el proyecto

```bash
npm run dev
```

Este comando levanta backend + frontend en modo desarrollo.

## Scripts utiles

- `npm run start`: inicia backend
- `npm run frontend:dev`: inicia frontend
- `npm run frontend:build`: build de produccion frontend
- `npm run db:init`: crea esquema inicial
- `npm run db:seed`: carga datos base
- `npm run db:migrate`: migra cambios de auth/auditoria
- `npm run auth:sync:dry`: simulacion sync usuarios auth
- `npm run auth:sync:apply`: aplica sync usuarios auth
- `npm run moby:sync:dry`: simulacion sync desde Moby
- `npm run moby:sync:apply`: aplica sync desde Moby

## Rutas UI principales

- `/dashboard`
- `/catalogo`
- `/calendario`
- `/citas`
- `/logs`
- `/auth-supabase` (solo admin)

## Despliegue

### Frontend en Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Variables: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

Configuracion SPA: `frontend/vercel.json` ya incluye rewrite a `index.html`.

### Backend en Render

Archivo base: `render.yaml`

- Build command: `npm install`
- Start command: `node src/server.js`
- Variables minimas:
	- `NODE_ENV=production`
	- `DATABASE_URL`
	- `CORS_ORIGINS`
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `SUPABASE_JWT_AUDIENCE`

## Seguridad

- No incluir secretos en commits (`.env`, llaves de servicio).
- Rotar inmediatamente cualquier clave expuesta.
