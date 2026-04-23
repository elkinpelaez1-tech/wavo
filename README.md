# wavo

Plataforma de mensajería masiva WhatsApp Business.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | NestJS 10 + Node.js 20 |
| Cola | BullMQ + Redis (Upstash) |
| Base de datos | Supabase (PostgreSQL) |
| Email | Resend |
| API externa | Meta WhatsApp Cloud API v19.0 |
| Deploy | Vercel (web) + Render (api + worker) |

## Estructura

```
wavo/
  apps/
    api/     ← NestJS backend
    web/     ← Next.js frontend
  packages/
    db/      ← SQL schema de Supabase
```

## Setup rápido

### 1. Instalar dependencias

```bash
cd apps/api && npm install
cd apps/web && npm install
```

### 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Editar ambos archivos con tus credenciales.

### 3. Base de datos

Ejecutar `packages/db/schema.sql` en el SQL Editor de Supabase.

### 4. Correr en desarrollo

```bash
# Terminal 1 — API
cd apps/api && npm run dev

# Terminal 2 — Worker
cd apps/api && npm run worker

# Terminal 3 — Frontend
cd apps/web && npm run dev
```

API disponible en: `http://localhost:3001`  
Frontend en: `http://localhost:3000`

## Deploy

| Servicio | Comando |
|---|---|
| Vercel | conectar repo → raíz `apps/web` |
| Render Web Service | `cd apps/api && npm run build && node dist/main` |
| Render Worker | `cd apps/api && node dist/worker` |

## Documentación completa

Ver `wavo_documento_tecnico.docx` para arquitectura, flujos, configuración Meta y checklist de implementación.
