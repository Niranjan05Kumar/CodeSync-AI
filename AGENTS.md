# AGENT INSTRUCTIONS & ARCHITECTURAL GUARDRAILS
## Project: CodeSync AI (Real-Time Collaborative Cloud Code Editor)

> **Project Name**: CodeSync AI  
> **Target Audience**: Any autonomous or pair-programming AI agent (Gemini, Claude, GPT, Cursor, Antigravity) working in this repository.  
> **Core Objective**: Implement, test, debug, or extend the Cloud IDE without violating architectural constraints, security boundaries, or design standards.

---

## 1. Authoritative Reference Documents

Before generating or modifying any code in this repository, you **MUST** align with the specifications defined in:

1. **[FINAL_TECHNICAL_REPORT.md](file:///d:/CodeEditor/FINAL_TECHNICAL_REPORT.md)**: The single source of truth for:
   * System architecture & data flow
   * PostgreSQL + pgvector DDL schema, indexes, and cascades
   * REST API contracts (`/api/v1/*`) with Zod request/response types
   * Socket.IO real-time event protocols & payload structures
   * Sandboxed code execution (Dockerode, BullMQ, security flags)
   * RAG pipeline (Recursive code chunking, `text-embedding-3-small`, HNSW search)
   * Multi-instance Redis adapter & S3 two-tier storage hierarchy

2. **[UI_DESIGN.md](file:///d:/CodeEditor/UI_DESIGN.md)**: The single source of truth for:
   * Professional VS Code Dark Modern design tokens (`#181818`, `#1e1e1e`, `#1f1f1f`, `#252526`, `#007acc`)
   * Tailwind CSS theme configuration and typography (`JetBrains Mono`, `Inter`)
   * Monaco Editor construction options and remote cursor styling
   * Pixel-level layout geometry (Top Bar 40px, Activity Bar 48px, Status Bar 24px)
   * Collaborator 6-color palette for real-time cursor presence

---

## 2. Implementation Phases & Strict Execution Order

All work must follow this strict dependency order. **Do NOT skip ahead** or build higher-level features on top of mock layers unless explicitly instructed by the user:

```text
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
  │           │           │           │           │
  ▼           ▼           ▼           ▼           ▼
Project     Database    Backend     Frontend     Monaco
Init &      pgvector    REST APIs   Workspace    Editor
Scaffold    Schema      & Auth      & Tree       Embedding

  Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8 ──► Phase 9
    │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼
  Real-Time   Sandboxed   Basic AI    Project-    Hardening
  Collab &    Docker      Assistant   Aware RAG   & Cloud
  Presence    Execution   (OpenAI)    pgvector    Deploy
```

* **Phase 0: Project Initialization & Environment Setup**: Root monorepo scaffold (`client/`, `server/`, `worker/`, `docker-runtimes/`), `docker-compose.yml` for local Postgres+pgvector/Redis/MinIO, root `package.json` workspaces, TypeScript configs, `.env.example`.
* **Phase 1: Database Foundation & Vector Schema**: Run PostgreSQL migrations (`schema.sql`), enable `uuid-ossp` and `vector`, set up DB connection pool with `pg` / `pg-pool`, configure HNSW index.
* **Phase 2: Backend REST APIs & Authentication**: Express setup, JWT Access (15m) + Refresh Token (7d) rotation, bcrypt password hashing, Zod validation middleware, `/api/v1/auth`, `/api/v1/projects`, `/api/v1/projects/:id/files`.
* **Phase 3: Frontend Shell & File Management**: Vite + React 18 + Tailwind, Zustand stores, layout split handles, Explorer tree with inline file/folder creation, context menus, and project dashboard.
* **Phase 4: Monaco Editor Integration**: Mount `@monaco-editor/react`, configure `vs-dark` theme, JetBrains Mono font ligatures, multi-tab state manager, breadcrumb trail, unsaved indicators.
* **Phase 5: Real-Time Collaboration & Presence**: Socket.IO server with JWT handshake auth, delta-based change broadcasts (`range`, `rangeOffset`, `text`, `versionId`), Monaco `model.applyEdits()`, remote cursor flags, in-room chat, Redis adapter.
* **Phase 6: Sandboxed Code Execution Engine**: BullMQ job queue, dedicated worker process, Dockerode runner, strict security flags (`--network none`, `--memory 128m`, `--cpus 0.5`, `--pids-limit 64`, `--read-only`, non-root user), execution output panel.
* **Phase 7: Basic AI Assistant**: OpenAI API integration for single-file Code Review (JSON format), Debugging, Code Explanation, and Code Improvement with streaming markdown response.
* **Phase 8: Project-Aware RAG Pipeline**: Language-aware code chunking (500 tokens, 80 overlap), batch embeddings via `text-embedding-3-small`, pgvector cosine similarity search, grounded prompt injection with cited file/line accordion.
* **Phase 9: Production Hardening & Cloud Deployment**: End-to-end stress testing, rate limiting (`express-rate-limit` + Redis), CORS lockdown, deployment setup (Vercel, Render/VPS, Supabase).

---

## 3. Critical Architectural Rules & Anti-Patterns

Any agent violating these rules is writing broken or insecure code. Check your code against this list before finalizing edits:

### 3.1 Real-Time Synchronization Rules
* ❌ **NEVER** broadcast full file text (`code-change` with full string) on every keystroke.
* ❌ **NEVER** call `model.setValue()` in Monaco when receiving remote changes (this resets local cursor position and selection).
* ❌ **NEVER** emit changes back to the sender (`io.to(roomId).emit` causes infinite echo loops).
* ✅ **ALWAYS** broadcast Monaco delta changes (`MonacoChange[]`) using `socket.broadcast.to(roomId).emit('editor:change', ...)`.
* ✅ **ALWAYS** apply remote deltas via `model.applyEdits()`.
* ✅ **ALWAYS** debounce database persistence (1.5s timer) via a Redis buffer (`project:<id>:file:<id>:buff`).

### 3.2 File Storage & Tiering Rules
* ❌ **NEVER** make synchronous Amazon S3 calls on every keystroke, file click, or tab switch (S3 has 100-300ms latency and per-request costs).
* ✅ **ALWAYS** store active source file contents directly in PostgreSQL (`files.content TEXT`).
* ✅ **RESERVE S3** strictly for:
  1. Asynchronous project `.zip` backup archives
  2. Nightly snapshots (`projects/{id}/snapshots/{timestamp}.tar.gz`)
  3. User avatar image uploads via pre-signed URLs

### 3.3 Code Execution & Container Security Rules
* ❌ **NEVER** execute `exec('docker run ...')` or `child_process.exec()` synchronously inside Express route handlers (this blocks Node's event loop and risks remote code execution).
* ❌ **NEVER** mount the host root filesystem or leave container networking enabled.
* ✅ **ALWAYS** push execution jobs to a **BullMQ queue** and process them in a decoupled worker.
* ✅ **ALWAYS** apply these mandatory Docker security flags:
  * `--network none` (neutralizes data exfiltration and AWS metadata scraping at `169.254.169.254`)
  * `--memory 128m --memory-swap 128m` (prevents host RAM exhaustion)
  * `--cpus 0.50` (restricts CPU core quota to 50%)
  * `--pids-limit 64` (neutralizes fork-bombs `:(){ :|:& };:`)
  * `--read-only` (read-only root filesystem)
  * `--user 10001:10001` (unprivileged `sandboxuser`)
  * `--tmpfs /tmp:rw,noexec,nosuid,size=16m` (transient in-memory scratch space)
  * Hard wall-clock timeout: `5000ms` via `setTimeout(() => container.kill('SIGKILL'), 5000)`
  * Output buffer ceiling: Truncate stdout/stderr to 64KB.

### 3.4 Database & Vector Search Rules
* ❌ **NEVER** construct SQL queries using string interpolation or template literals (SQL injection hazard).
* ❌ **NEVER** execute unindexed cosine distance queries on large tables (`ORDER BY embedding <=> $1` without an HNSW index causes a full table scan).
* ✅ **ALWAYS** use parameterized queries (`$1, $2`) via `pg.Pool`.
* ✅ **ALWAYS** filter vector queries by `project_id` before ordering:
  ```sql
  WHERE ce.project_id = $1 AND 1 - (ce.embedding <=> $2::vector) >= 0.70
  ORDER BY ce.embedding <=> $2::vector ASC LIMIT 5;
  ```
* ✅ **ALWAYS** ensure `ON DELETE CASCADE` is present on foreign keys referencing `projects(id)` or `files(id)`.

### 3.5 UI & Styling Rules
* ❌ **NEVER** use glassmorphism, flashy gradients, neon colors, oversized cards, or marketing hero sections.
* ❌ **NEVER** use random arbitrary colors for dark surfaces.
* ✅ **ALWAYS** adhere to the design tokens in [UI_DESIGN.md](file:///d:/CodeEditor/UI_DESIGN.md):
  * Activity Bar: `#181818`
  * Sidebar: `#1e1e1e`
  * Monaco Editor Canvas: `#1f1f1f`
  * Elevated Menus/Modals: `#252526`
  * Borders: `#2b2b2b`
  * Primary Accent: VS Code Blue (`#007acc`, hover: `#0e639c`)
  * Code font: `JetBrains Mono` / `Fira Code`, 14px, line-height 21px.

---

## 4. Repository Layout & Module Ownership

When creating files, place them in the correct module:

```text
d:\CodeEditor/
├── package.json              # Root npm workspace
├── docker-compose.yml        # Local Postgres (pgvector), Redis, MinIO
├── .env.example              # Consolidated environment variable contract
│
├── client/                   # REACT 18 FRONTEND
│   ├── src/
│   │   ├── api/              # Axios / Fetch client wrappers
│   │   ├── components/
│   │   │   ├── activity-bar/ # ActivityBar.tsx
│   │   │   ├── editor/       # MonacoEditor.tsx, EditorTabs.tsx, Breadcrumbs.tsx
│   │   │   ├── file-tree/    # FileTree.tsx, FileItem.tsx, InlineCreate.tsx
│   │   │   ├── ai/           # AIAssistantPanel.tsx, ReviewCard.tsx, RAGCitations.tsx
│   │   │   ├── dock/         # BottomDock.tsx, OutputTab.tsx, TerminalTab.tsx, ChatTab.tsx
│   │   │   ├── modals/       # QuickOpenModal.tsx, InviteModal.tsx, CreateProjectModal.tsx
│   │   │   └── status-bar/   # StatusBar.tsx
│   │   ├── hooks/            # useSocket.ts, useMonacoSync.ts, useAuth.ts, useDebounce.ts
│   │   ├── store/            # Zustand stores: useEditorStore.ts, useUIStore.ts, useAuthStore.ts
│   │   └── types/            # Shared client TypeScript types
│   ├── tailwind.config.js    # Strict VS Code color tokens
│   └── vite.config.ts
│
├── server/                   # NODE.JS + EXPRESS + SOCKET.IO BACKEND
│   ├── src/
│   │   ├── config/           # db.ts (pg pool), redis.ts, s3.ts, openai.ts
│   │   ├── controllers/      # authController.ts, projectController.ts, fileController.ts, aiController.ts
│   │   ├── routes/           # authRoutes.ts, projectRoutes.ts, aiRoutes.ts, executeRoutes.ts
│   │   ├── middlewares/      # authMiddleware.ts, zodValidator.ts, rateLimiter.ts, errorHandler.ts
│   │   ├── sockets/          # socketServer.ts, editorSyncHandler.ts, presenceHandler.ts, chatHandler.ts
│   │   ├── services/         # authService.ts, projectService.ts, aiService.ts, ragService.ts
│   │   └── db/               # schema.sql, migrations/
│   └── tsconfig.json
│
├── worker/                   # BULLMQ BACKGROUND TASK PROCESSOR
│   ├── src/
│   │   ├── index.ts          # Worker process runner
│   │   ├── queues/           # executionQueue.ts, indexingQueue.ts
│   │   ├── jobs/             # codeExecutionJob.ts, ragIndexingJob.ts
│   │   └── sandbox/          # dockerRunner.ts, securityLimits.ts
│   └── package.json
│
└── docker-runtimes/          # EXECUTION CONTAINER DEFINITIONS
    ├── Dockerfile.sandbox    # Alpine with Python 3.11, Node 20, GCC 13, OpenJDK 17
    └── build-sandboxes.sh
```

---

## 5. Environment Variables Contract

All agents must configure or read environment variables according to this schema:

```bash
# ==========================================
# BACKEND SERVER (server/.env)
# ==========================================
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Vectors
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_editor_db

# Redis & BullMQ
REDIS_URL=redis://localhost:6379

# Authentication Secrets
JWT_ACCESS_SECRET=super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# AWS S3 / MinIO (Object Storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=code-editor-snapshots
AWS_S3_ENDPOINT=http://localhost:9000  # For local MinIO, omit for real AWS S3
AWS_S3_FORCE_PATH_STYLE=true           # Required for MinIO

# ==========================================
# WORKER PROCESS (worker/.env)
# ==========================================
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_editor_db
OPENAI_API_KEY=sk-proj-...
DOCKER_SOCKET_PATH=/var/run/docker.sock

# ==========================================
# FRONTEND CLIENT (client/.env)
# ==========================================
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 6. Testing & Verification Requirements

When an agent completes a task or phase, it **MUST verify** the deliverable:

1. **Schema Migrations**: Run SQL DDL in PostgreSQL and verify table creation and vector extension (`SELECT * FROM pg_extension WHERE extname = 'vector'`).
2. **Type Checking**: Run `npm run type-check` or `npx tsc --noEmit` across client, server, and worker. Zero TypeScript errors allowed.
3. **API Contracts**: Test endpoints using curl, Supertest, or Postman collections; ensure error paths return standardized `{ success: false, error: { message, code } }` with proper HTTP status codes (400, 401, 403, 404, 500).
4. **Real-Time Testing**: Confirm that Socket.IO events match the payload signatures in Section 7 of [FINAL_TECHNICAL_REPORT.md](file:///d:/CodeEditor/FINAL_TECHNICAL_REPORT.md).
5. **Sandbox Verification**: When testing code execution, run a loop script (`while True: pass`) to ensure the 5-second SIGKILL terminates the container without crashing the Node.js server.
6. **Git Milestone & Push Discipline**: After completing and verifying each phase or significant feature update, the agent **MUST automatically stage, commit, and push** the tested code to `origin main` (`https://github.com/Niranjan05Kumar/CodeSync-AI.git`). Never commit `.env` or secret files.
