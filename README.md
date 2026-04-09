# Urbani Smart Scheduling

## Configuracion de persistencia (PostgreSQL Supabase)
El backend ahora carga `.env` automaticamente.

Contenido sugerido de `.env`:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGINS=*
DATABASE_URL=postgresql://postgres.juonpjkzbbyauwiwfeql:yz6jduf3cYo1w8IP@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

## Levantar proyecto (1 comando)
```bash
npm run dev
```

Esto levanta:
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Inicializar base de datos
```bash
npm run db:init
```

## Cargar datos demo
Actualmente cargados:
- 3 proyectos
- 10 reservas

## Rutas principales UI
- `/dashboard`
- `/catalogo`
- `/calendario`
- `/citas`

## Build frontend
```bash
npm run frontend:build
```
