# CodeSync AI — Production Deployment Guide

> **Target Platforms**: 
> * **Frontend Client**: Vercel (Edge CDN, SPA)
> * **Backend API & WebSockets**: Render (Node.js Web Service)
> * **Database**: Supabase / Neon (PostgreSQL 16 with `pgvector`)
> * **Cache & Queues**: Upstash (Serverless Redis)
> * **Object Storage**: AWS S3 / Cloudflare R2 / MinIO

---

## 1. Production Architecture Diagram

```text
┌────────────────────────────────────────────────────────┐
│               Users (Web / Mobile / Tablet)           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / WSS
                            ▼
┌────────────────────────────────────────────────────────┐
│            Vercel Global Edge CDN (Frontend)           │
│   • React 18 + TypeScript + Monaco Editor              │
│   • Tailwind CSS (VS Code Dark Modern Tokens)          │
│   • Client-side routing via vercel.json                │
└───────────────────────────┬────────────────────────────┘
                            │ REST / Socket.IO
                            ▼
┌────────────────────────────────────────────────────────┐
│             Render Web Service (Backend Server)        │
│   • Node.js 20 + Express (HTTP REST API)               │
│   • Socket.IO Real-Time Deltas & Presence Engine       │
│   • Helmet HTTP Security & Express Rate Limiter        │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       PostgreSQL Pool            Redis Pub/Sub
                ▼                        ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│  PostgreSQL 16 + pgvector     │ │   Upstash Redis      │
│  • Supabase / Neon Managed    │ │   • BullMQ Queues    │
│  • HNSW Vector Index (1536d)  │ │   • Socket.IO Scale  │
│  • Schema Migration Runner    │ │   • Ephemeral Buffer │
└───────────────────────────────┘ └──────────────────────┘
                │                        ▲
       Context Retrieval                 │ Queue Job
                ▼                        ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│   OpenAI / Groq / Gemini API  │ │  Background Worker   │
│   • Code Review & Debugging   │ │  • Sandboxed Docker  │
│   • Project-Aware RAG Embeds  │ │  • Isolated Runtimes │
└───────────────────────────────┘ └──────────────────────┘
```

---

## 2. Prerequisites & Cloud Accounts

Before deploying, ensure you have:
1. **GitHub Account**: Repository pushed with `client/` and `server/` code.
2. **Vercel Account**: For deploying the frontend React application.
3. **Render Account**: For deploying the Node.js + Socket.IO server.
4. **Supabase or Neon Account**: For PostgreSQL 16 with `pgvector` extension.
5. **Upstash Account**: For Redis (Free tier available).
6. **OpenAI API Key** (or Groq / Google Gemini key) for AI features.

---

## 3. Step 1: Database Setup (Supabase / Neon)

1. **Create Database**:
   * Create a new project in [Supabase](https://supabase.com) or [Neon](https://neon.tech).
   * Note down the connection string (`postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`).
2. **Verify / Enable Extensions**:
   * Open the SQL Editor in your database dashboard and confirm:
     ```sql
     CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
     CREATE EXTENSION IF NOT EXISTS "vector";
     ```
3. **Execute Migrations**:
   * From your local terminal, run:
     ```bash
     npm --prefix server run db:migrate
     ```
   * The migration script creates all tables (`users`, `projects`, `files`, `chat_messages`, `code_embeddings`) and builds the `idx_code_embeddings_hnsw` index.

---

## 4. Step 2: Redis Setup (Upstash)

1. Log into [Upstash](https://upstash.com) and create a Redis database.
2. Choose **TLS Enabled**.
3. Copy the `REDIS_URL` connection string (e.g. `rediss://default:[TOKEN]@[HOST]:6379`).

---

## 5. Step 3: Backend Deployment (Render)

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure service settings:
   * **Name**: `codesync-api`
   * **Root Directory**: `server`
   * **Environment**: `Node`
   * **Build Command**: `npm ci && npm run build`
   * **Start Command**: `npm run start`
   * **Plan**: Starter or Standard (WebSockets require persistent connections).
4. Configure **Environment Variables** in Render:
   ```env
   NODE_ENV=production
   PORT=10000
   CLIENT_URL=https://your-codesync-app.vercel.app
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   REDIS_URL=rediss://default:[TOKEN]@[HOST]:6379
   JWT_ACCESS_SECRET=[GENERATE-STRONG-64-CHAR-HEX]
   JWT_REFRESH_SECRET=[GENERATE-STRONG-64-CHAR-HEX]
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   OPENAI_API_KEY=sk-proj-...
   ```
5. Configure Health Check:
   * **Health Check Path**: `/health` (or `/api/v1/health`)
6. Click **Create Web Service**. Once deployed, copy your service URL (e.g., `https://codesync-api.onrender.com`).

---

## 6. Step 4: Frontend Deployment (Vercel)

1. In the [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
2. Configure project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click *Edit* and select `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
3. Add **Environment Variables** in Vercel:
   ```env
   VITE_API_URL=https://codesync-api.onrender.com/api/v1
   VITE_SOCKET_URL=https://codesync-api.onrender.com
   ```
4. Click **Deploy**. Vercel will build and assign your production URL (e.g., `https://codesync-ai.vercel.app`).
5. **Update Render CORS**:
   * Return to your Render Web Service settings and verify that `CLIENT_URL` matches your actual Vercel domain (`https://codesync-ai.vercel.app`).

---

## 7. Step 5: Background Worker Deployment (Optional)

If using Dockerized compilation on a Linux VPS / Render Private Service:
1. Navigate to `worker/`.
2. Build container:
   ```bash
   docker build -t codesync-worker .
   ```
3. Run container connecting to production Redis and Database:
   ```bash
   docker run -d \
     --name codesync-worker \
     -e NODE_ENV=production \
     -e REDIS_URL=rediss://... \
     -e DATABASE_URL=postgresql://... \
     -v /var/run/docker.sock:/var/run/docker.sock \
     codesync-worker
   ```

---

## 8. Production Smoke Test Verification

Execute this checklist once deployed to verify live stability:

1. **Health Check**:
   * Visit `https://codesync-api.onrender.com/health`. Expect `{ "status": "UP", "database": "connected" }`.
2. **Authentication Flow**:
   * Open `https://codesync-ai.vercel.app`.
   * Register a new user account.
   * Verify JWT tokens in browser DevTools Application → LocalStorage.
3. **Project Management**:
   * Create a new project named `Production Demo`.
   * Create folders and files (`main.py`, `index.js`, `README.md`).
4. **Real-Time Collaboration**:
   * Open an incognito window, log in with a second account, and join using the 8-character Room ID.
   * Type in Monaco Editor; verify character deltas broadcast instantly with remote cursor presence.
5. **AI Assistant**:
   * Click **AI Assistant** in the top bar.
   * Ask for a code review or explanation; verify streaming markdown output.
6. **Code Execution**:
   * Open a Python or C++ file and press `Ctrl+Enter` or click **Run**.
   * Verify output appears in the bottom dock within 5 seconds.
