# Urbani Smart Scheduling — Guía de arranque

## Requisitos

- Node.js >= 18
- npm >= 9

> **Nota Node.js 22+:** existe un bug entre `postcss-load-config` v6 y Node.js 22+.
> El archivo `frontend/postcss.config.js` (ya incluido en el repo) lo resuelve.

---

## Desarrollo local

### 1. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@host:5432/basededatos
CORS_ORIGINS=http://localhost:5173
```

Crea un archivo `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

### 2. Instalar dependencias

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 3. Inicializar la base de datos (Supabase)

Ejecuta el schema en tu proyecto Supabase:

```bash
# Aplica el schema directamente en el SQL Editor de Supabase
# o con psql:
psql $DATABASE_URL -f src/db/schema.sql
```

Para cargar datos de prueba:

```bash
node src/db/seed.js
```

### 4. Arrancar el backend

```bash
node src/server.js
# -> http://localhost:3000
```

### 5. Arrancar el frontend

```bash
cd frontend
npm run dev
# -> http://localhost:5173
```

---

## Despliegue en producción

### Base de datos — Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Database → Connection string → URI** y copia la cadena de conexión
3. En el SQL Editor, ejecuta el contenido de `src/db/schema.sql`
4. (Opcional) ejecuta `src/db/seed.js` apuntando a la URL de producción

### Backend — Render

1. Conecta el repositorio en [render.com](https://render.com) → **New Web Service**
2. El archivo `render.yaml` en la raíz configura el servicio automáticamente
3. En **Environment Variables** del dashboard de Render, agrega:
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | URI de conexión de Supabase (con `?sslmode=require`) |
   | `CORS_ORIGINS` | URL del frontend en Vercel, ej. `https://urbani.vercel.app` |
4. Haz deploy — la URL quedará del tipo `https://urbani-scheduling-api.onrender.com`

### Frontend — Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com) → **New Project**
2. Configura:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
3. En **Environment Variables** agrega:
   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | URL del backend en Render, ej. `https://urbani-scheduling-api.onrender.com` |
4. El archivo `frontend/vercel.json` ya incluye las reglas de rewrite para SPA
5. Haz deploy

---

## Scripts disponibles

```bash
# Backend
node src/server.js          # Arrancar servidor
node src/db/init.js         # Crear tablas (schema.sql)
node src/db/seed.js         # Cargar datos de prueba

# Frontend
cd frontend
npm run dev                 # Servidor de desarrollo (puerto 5173)
npm run build               # Build de producción -> frontend/dist/
npm run preview             # Vista previa del build
```

---

## Variables de entorno — referencia completa

| Variable | Descripción | Default |
|---|---|---|
| `NODE_ENV` | Entorno (`development` / `production`) | `development` |
| `PORT` | Puerto del servidor HTTP | `3000` |
| `DATABASE_URL` | URI de conexión PostgreSQL (Supabase) | *(requerido)* |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma. Usa `*` para todos | `*` |
| `VITE_API_URL` | URL base del backend (solo frontend) | *(vacío = mismo origen)* |
