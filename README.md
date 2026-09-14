# CodeSync AI — Real-Time Collaborative Cloud IDE

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **CodeSync AI** is a real-time collaborative cloud IDE combining a VS Code Dark Modern interface, Monaco code editor, sub-50ms delta synchronization, sandboxed code execution, and project-aware AI assistance with pgvector RAG.

---

## 🌟 Key Features

* **VS Code Dark Modern UI**: Authentic developer aesthetics (`#181818`, `#1e1e1e`, `#1f1f1f`, `#007acc`), JetBrains Mono typography, collapsible sidebars, and tab manager.
* **Responsive Multi-Device Layout**: Fully adaptive across Desktop (≥1200px), Tablet (768px–1199px), and Mobile (<768px) with touch-friendly navigation drawers and responsive bottom sheets.
* **Real-Time Collaboration**: Socket.IO delta change broadcasts (`model.applyEdits()`), collaborative multi-color remote cursor presence, and room chat.
* **Instant Sandboxed Execution**: Secure runner with 5-second SIGKILL timeout, 128MB RAM quota, 50% CPU throttling, and isolated environments.
* **Project-Aware RAG AI**: Language-aware code chunking, OpenAI / Groq / Gemini integrations, and sub-10ms HNSW cosine vector search over `code_embeddings`.
* **Enterprise Security**: Dual-token JWT rotation (15m access / 7d refresh), bcrypt hashing, project RBAC, Helmet headers, and tiered rate limiting.

---

## 🏗️ System Architecture

```text
client/ (React 18 + Vite + Tailwind + Monaco)
   │
   ├── REST APIs & Auth ──────► server/ (Express + PostgreSQL Pool)
   │                                   │
   ├── Real-Time Deltas ──────► server/ (Socket.IO + Redis Adapter)
   │                                   │
   └── AI & RAG Queries ──────► server/ (OpenAI API + pgvector HNSW)
                                       │
                                       ▼
                             worker/ (BullMQ + Docker Sandbox)
```

---

## 🚀 Quickstart (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/Niranjan05Kumar/CodeSync-AI.git
cd CodeSync-AI
npm install
```

### 2. Configure Environment Variables
Copy the template contracts:
```bash
cp .env.example server/.env
cp client/.env.example client/.env
cp worker/.env.example worker/.env
```

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Start Development Servers
```bash
# Start Backend API & Socket.IO (Port 5000)
npm run dev:server

# In a second terminal, start Frontend Client (Port 5173)
npm run dev:client

# (Optional) Start Sandboxed BullMQ Worker
npm run dev:worker
```
Visit `http://localhost:5173` in your browser.

---

## 📦 Production Deployment

For complete, step-by-step production cloud deployment guides:

* 📖 **[DEPLOYMENT.md](file:///d:/CodeSync%20AI/DEPLOYMENT.md)**: Deploying on **Vercel** (Frontend), **Render** (Backend), **Supabase/Neon** (PostgreSQL + pgvector), and **Upstash** (Redis).
* ⚙️ **[ENVIRONMENT.md](file:///d:/CodeSync%20AI/ENVIRONMENT.md)**: Exhaustive environment variable matrix and validation rules.
* 🛡️ **[SECURITY.md](file:///d:/CodeSync%20AI/SECURITY.md)**: Security boundaries, Docker execution limits, and threat mitigations.

---

## 🛠️ Verification & Build Commands

```bash
# Type check all workspaces
npm run type-check

# Build frontend for production
npm --prefix client run build

# Build backend for production
npm --prefix server run build

# Build worker for production
npm --prefix worker run build
```

---

## 📄 License
This project is licensed under the MIT License.
