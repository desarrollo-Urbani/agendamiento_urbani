# Urbani Smart Scheduling

## Backend
```bash
npm run db:init
npm run db:seed
npm start
```
Backend/API: `http://localhost:3000`

## Frontend React (Premium)
```bash
npm run frontend:install
npm run frontend:dev
```
Frontend dev: `http://localhost:5173`

## Build frontend para produccion
```bash
npm run frontend:build
npm start
```
El backend sirve `frontend/dist` en rutas:
- /catalogo
- /calendario
- /formulario
- /confirmacion

## API
- GET /api/projects
- GET /api/availability
- GET /api/visits
- GET /api/blocks
- GET /api/calendar
- POST /api/book
- PUT /api/reschedule
- DELETE /api/cancel

## Arquitectura Backend
- `src/routes`
- `src/controllers`
- `src/services`
- `src/repositories`
- `src/validators`
- `src/shared`
- `src/config`
