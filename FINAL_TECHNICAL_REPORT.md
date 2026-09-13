# AI-Powered Real-Time Collaborative Code Editor
## Production-Ready Technical Specification & Architecture Blueprint


### Implementation Phases (In Order)

- **Phase 0**: Project Initialization & Environment Setup (Repository layout, folder structure, Docker Compose for local Postgres/Redis/MinIO, root npm workspace, env contracts)
- **Phase 1**: Database Foundation & Vector Schema (PostgreSQL + pgvector setup, DDL tables, indexes, pool connection)
- **Phase 2**: Backend REST APIs & Authentication (Node.js, Express, JWT access/refresh, Zod validation, error middleware)
- **Phase 3**: Frontend Shell & File Management (React, Vite, Tailwind CSS, Project Workspace, nested File Tree)
- **Phase 4**: Monaco Editor Integration (Monaco embedding, custom vs-dark theme, syntax modes, multi-tab state)
- **Phase 5**: Real-Time Collaboration & Presence (Socket.IO deltas, remote cursors/selections, in-room chat, Redis adapter)
- **Phase 6**: Sandboxed Code Execution Engine (BullMQ worker, Dockerode runner, security isolation flags, execution console)
- **Phase 7**: Basic AI Assistant (Single-file Review, Debug, Explain via OpenAI API, prompt templates)
- **Phase 8**: Project-Aware RAG Pipeline (Recursive code chunking, embeddings, pgvector cosine search, cited context UI)
- **Phase 9**: Production Hardening & Cloud Deployment (Vercel, Render/VPS, Supabase, end-to-end testing, CI/CD)

---

## 1. Executive Summary & Critical Review of Original Plan

### 1.1 Architectural Audit & Gap Analysis

The initial draft outlined in `PROJECT_REPORT.md` provided a good conceptual overview but suffered from several critical architectural flaws, unrealistic assumptions, and omissions that would cause immediate failure during implementation:

| Domain | Original Proposal | Critical Flaw Identified | Practical Production-Grade Refinement |
| :--- | :--- | :--- | :--- |
| **Real-Time Synchronization** | Naive Socket.IO string broadcasting (`code-change` event transmitting full text on keystroke) | **Keystroke Race Conditions & Cursor Jumps**: Full-text broadcasts create infinite echo loops, cursor resetting to line 1, and race conditions where concurrent keystrokes overwrite each other. | **Versioned Delta Broadcast with Debounced Persistence**: Send Monaco editor delta change events (`range`, `rangeOffset`, `text`, `versionId`) with client-side optimistic apply and cursor offset tracking, backed by a debounced (1.5s) snapshot sync to the database. |
| **File Storage Hierarchy** | Storing active source files exclusively in Amazon S3, with PostgreSQL storing only `storage_key` | **Latency & Transaction Bottlenecks**: S3 has 100–300ms latency per GET/PUT, eventual consistency hazards, and costs per API call. Doing S3 writes on real-time file saves causes intolerable lag. | **Two-Tier Storage**: Active project files live directly in PostgreSQL (`files.content TEXT`) with in-memory Redis caching. Amazon S3 is reserved for **asynchronous project ZIP archives, export snapshots, and media/assets**. |
| **Code Execution Engine** | Docker execution triggered directly inside Express route handler | **Event Loop Starvation & Remote Code Execution (RCE)**: Calling `exec('docker run ...')` synchronously from Express blocks the Node event loop and exposes the server to container exhaustion and host socket compromise. Furthermore, **Render free web services cannot run Docker daemons**. | **Asynchronous Worker with Sandboxed Dockerode**: Express pushes jobs to a **BullMQ / Redis queue**. A decoupled worker executes containers with non-root user, `--network none`, `--memory 128m`, `--cpus 0.5`, `--pids-limit 64`, `--read-only`, and tmpfs mounts. |
| **RAG Pipeline** | "Chunk code logically by functions and classes" without an AST parser specification | **Implementation Impasse**: Building custom AST parsers across 5 languages is unrealistic for a student timeline and prone to parsing bugs. | **Language-Aware Recursive Character Chunking**: Use structured regex-based splitters honoring code boundaries (`\nclass `, `\nfunction `, `\ndef `, `\nexport `) with a 500-token window and 80-token overlap, embedded via OpenAI `text-embedding-3-small` (1536 dims). |
| **Database & Search** | Standalone high-level tables without types, cascade rules, or pgvector index definitions | **Query Degradation**: Without specific vector indexes (HNSW) and compound foreign keys, cosine similarity queries do a full table scan across all projects. | **Complete PostgreSQL DDL** with UUID primary keys, cascade deletions, compound indexes on `(project_id, path)`, and an **HNSW index** with `vector_cosine_ops`. |
| **AI Context & Cost** | Unbounded prompt injection sending arbitrary file contents | **Token Exhaustion & Prompt Injection**: Large files breach context limits and cost dollars per query. | **Strict Token Budgeting**: 2,500 token context budget for retrieved chunks, similarity threshold cutoff ($\ge 0.70$), and system prompt guardrails with Markdown code blocks. |

---

## 2. Final Project Scope & Feature Matrix

### 2.1 Core Feature Deliverables (MVP vs Advanced)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FEATURE ROADMAP                               │
├────────────────────────────────────┬────────────────────────────────────┤
│  PHASE 1: MUST-HAVE (MVP)          │  PHASE 2: ADVANCED EXTENSIONS      │
├────────────────────────────────────┼────────────────────────────────────┤
│ • JWT Auth (Access + Refresh)      │ • Yjs CRDT Collaborative Undo/Redo │
│ • Workspace & Project Management   │ • WebRTC Voice Channel in Room     │
│ • Nested File Tree (CRUD)          │ • Terminal Pty WebSockets          │
│ • Monaco Editor with Syntax/Themes │ • AST-based Tree-sitter Chunking   │
│ • Real-Time Code Sync (Socket.IO)  │ • Hybrid Search (pgvector + BM25)  │
│ • Multi-User Presence & Cursors    │ • Multi-file Compilation (Pip/Npm) │
│ • In-Room Real-Time Group Chat     │ • GitHub Repo Import/Export        │
│ • Docker Sandbox (Python, JS, C++) │ • LLM Streaming via SSE/Socket     │
│ • AI Assistant (Review, Debug)     │ • Multi-Provider Fallback (Claude) │
│ • Project-Aware RAG (pgvector)     │ • Presigned S3 Snapshot Downloader │
└────────────────────────────────────┴────────────────────────────────────┘
```

### 2.2 Explicit Out-of-Scope Items
To prevent project abandonment, the following items are **explicitly excluded**:
1. Full Language Server Protocol (LSP) servers per language (Monaco built-in syntax and web-workers provide ample completion).
2. Kubernetes orchestration for containers (Docker engine + Dockerode via Docker socket on worker node is optimal).
3. Live bidirectional interactive shell terminal (`pty.js`) in MVP (batch input via `stdin` is 10x safer and sufficient for DSA/prototyping).

---

## 3. Final Technology Stack & Justification

```text
┌────────────────────────────────────────────────────────────────────────┐
│                               TECH STACK                               │
├───────────────────┬──────────────────────────────────┬─────────────────┤
│ Layer             │ Technology                       │ Version         │
├───────────────────┼──────────────────────────────────┼─────────────────┤
│ Frontend Web      │ React.js + TypeScript + Vite     │ React 18, TS 5  │
│ UI & Styling      │ Tailwind CSS + Lucide Icons      │ Tailwind v3.4   │
│ Code Editor       │ @monaco-editor/react             │ Monaco v0.45+   │
│ Client State      │ Zustand + TanStack Query v5      │ Zustand v4.5    │
│ Backend Server    │ Node.js + Express.js + TS        │ Node 20 LTS     │
│ Real-Time Engine  │ Socket.IO + @socket.io/redis-adp │ Socket.IO v4.7  │
│ Primary Database  │ PostgreSQL + pgvector extension  │ Postgres 16     │
│ Cache & Queues    │ Redis + BullMQ                   │ Redis 7, BullMQ │
│ Sandboxed Sandbox │ Docker Engine + Dockerode        │ Docker API v1.43│
│ AI & Embeddings   │ OpenAI API (gpt-4o-mini, 3-small)│ openai SDK v4   │
│ Object Storage    │ AWS S3 / MinIO (S3 compatible)   │ @aws-sdk/v3     │
│ Validation        │ Zod                              │ Zod v3.22       │
└───────────────────┴──────────────────────────────────┴─────────────────┘
```

### 3.1 Stack Justification Matrix
* **React + Vite + TypeScript**: Sub-second Hot Module Replacement (HMR), strict type safety across shared WebSocket event contracts, and zero overhead compared to Next.js for client-heavy SPA IDE interfaces.
* **Monaco Editor**: The exact engine powering VS Code. Provides native multi-cursor support, diff viewers, AST tokenization, minimap, and command palette out of the box.
* **Node.js + Express**: Non-blocking I/O ideal for real-time WebSocket multiplexing and long-polling fallbacks.
* **PostgreSQL + pgvector**: Eliminates dual-database maintenance. One relational database handles ACID transactions, relational project/file trees, chat history, and 1536-dimensional vector similarity indexing.
* **Redis + BullMQ**: Guarantees that heavy tasks (RAG indexing and Docker compilation) never block HTTP request/response lifecycles.

---

## 4. End-to-End System Architecture

```
                       +-------------------------------+
                       |       Client (React SPA)       |
                       |  Monaco + Zustand + Socket.IO  |
                       +---------------+---------------+
                                       |
                     HTTPS REST API    |   WSS (WebSocket)
                     (Auth, CRUD, S3)  |   (Sync, Chat, Presence)
                                       v
                       +---------------+---------------+
                       |   API Gateway / Reverse Proxy |
                       |        (Nginx / Caddy)        |
                       +---------------+---------------+
                                       |
                       +---------------+---------------+
                       |     Node.js Express Server    |
                       |  - REST Routes - Middlewares  |
                       |  - Socket.IO Server Handlers  |
                       +-------+---------------+-------+
                               |               |
             +-----------------+               +-----------------+
             |                                                   |
             v                                                   v
+------------+------------+                             +--------+--------+
|   PostgreSQL 16 Engine  |                             |  Redis Cluster  |
|  - Relational Tables    |                             |  - Pub/Sub Bus  |
|  - pgvector HNSW Index  |                             |  - Room States  |
|  - ACID File Storage    |                             |  - BullMQ Queue |
+-------------------------+                             +--------+--------+
                                                                 |
                                       +-------------------------+
                                       | Job Dispatch
                                       v
                        +--------------+---------------+
                        |    Background Worker Process |
                        |     (BullMQ Job Consumer)    |
                        +-------+--------------+-------+
                                |              |
        Docker Daemon Socket    |              | OpenAI API HTTPS
        /var/run/docker.sock    |              |
                                v              v
                  +-------------+---+     +----+-------------+
                  | Docker Sandbox  |     | OpenAI Platform  |
                  | - Memory: 128MB |     | - Embeddings     |
                  | - CPU: 0.5 Core |     | - gpt-4o-mini    |
                  | - Network: NONE |     +------------------+
                  +-----------------+
```

---

## 5. Database Design & Complete PostgreSQL Schema

### 5.1 Relational & Vector DDL Script (`schema.sql`)

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- 2. PROJECTS TABLE
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    s3_backup_key VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_owner ON projects(owner_id);

-- 3. PROJECT MEMBERS TABLE (RBAC)
CREATE TYPE project_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role project_role DEFAULT 'editor',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);

-- 4. FILES & DIRECTORIES TABLE
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL, -- e.g., "src/components/Button.tsx"
    is_directory BOOLEAN DEFAULT FALSE,
    content TEXT DEFAULT '',     -- Active source text stored directly in PostgreSQL
    language VARCHAR(50) DEFAULT 'plaintext',
    size_bytes INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,   -- Incremented on every debounced save
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_file_path UNIQUE (project_id, path)
);

CREATE INDEX idx_files_project_parent ON files(project_id, parent_id);
CREATE INDEX idx_files_path ON files(project_id, path);

-- 5. CHAT MESSAGES TABLE
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_project_created ON chat_messages(project_id, created_at ASC);

-- 6. CODE EMBEDDINGS (pgvector RAG)
CREATE TABLE code_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_file_chunk UNIQUE (file_id, chunk_index)
);

CREATE INDEX idx_code_embeddings_project ON code_embeddings(project_id);

-- HNSW Vector Index for sub-10ms Cosine Similarity Search
CREATE INDEX idx_code_embeddings_hnsw 
ON code_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 7. CODE EXECUTION AUDIT LOGS
CREATE TYPE execution_status AS ENUM ('queued', 'running', 'completed', 'failed', 'timeout');

CREATE TABLE execution_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(30) NOT NULL,
    code TEXT NOT NULL,
    stdin TEXT DEFAULT '',
    stdout TEXT DEFAULT '',
    stderr TEXT DEFAULT '',
    exit_code INTEGER,
    execution_time_ms INTEGER,
    memory_used_bytes INTEGER,
    status execution_status DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exec_project ON execution_jobs(project_id, created_at DESC);

-- 8. AI CONVERSATIONS & SESSIONS
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) DEFAULT 'New AI Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context_chunks JSONB DEFAULT '[]'::jsonb, -- Cited file paths, lines, and similarity scores
    tokens_consumed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_messages_conv ON ai_messages(conversation_id, created_at ASC);
```

---

## 6. REST API Design & Contracts

All endpoints are prefixed with `/api/v1`. Authentication uses the standard `Authorization: Bearer <access_token>` header. Standardized JSON response wrapper:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 6.1 Authentication Endpoints (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
* **Request Body**:
```json
{
  "email": "student@example.com",
  "username": "codemaster",
  "password": "SecurePassword123!"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c62a3f78-2d83-4a11-b4f0-46654a9d7bb3",
      "email": "student@example.com",
      "username": "codemaster"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

#### `POST /api/v1/auth/login`
* **Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePassword123!"
}
```
* **Response (200 OK)**: Same payload as register.

#### `POST /api/v1/auth/refresh`
* **Request Body**: `{ "refreshToken": "eyJhbGciOi..." }`
* **Response (200 OK)**: `{ "accessToken": "eyJhbGciOi..." }`

---

### 6.2 Project & File System Endpoints

#### `GET /api/v1/projects`
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**: List of owned and joined projects with role and active member count.

#### `POST /api/v1/projects`
* **Request Body**:
```json
{
  "name": "Distributed Algorithm Lab",
  "description": "Lab work on Raft consensus in Python",
  "isPublic": false
}
```
* **Response (201 Created)**: Created project metadata including default root directory structure.

#### `GET /api/v1/projects/:projectId/tree`
* **Response (200 OK)**: Hierarchical file tree representation.
```json
{
  "success": true,
  "data": [
    {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "name": "src",
      "path": "src",
      "isDirectory": true,
      "children": [
        {
          "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
          "name": "main.py",
          "path": "src/main.py",
          "isDirectory": false,
          "language": "python",
          "sizeBytes": 1240,
          "updatedAt": "2026-09-13T01:00:00Z"
        }
      ]
    }
  ]
}
```

#### `GET /api/v1/projects/:projectId/files/:fileId`
* **Response (200 OK)**: Retrieves complete text content and metadata of a specific file.

#### `POST /api/v1/projects/:projectId/files`
* **Request Body**:
```json
{
  "parentId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "server.py",
  "isDirectory": false
}
```

#### `PUT /api/v1/projects/:projectId/files/:fileId`
* **Description**: Debounced HTTP persistence fallback (when saving explicitly or closing tabs).
* **Request Body**:
```json
{
  "content": "import socket\n\ns = socket.socket()",
  "version": 4
}
```

#### `DELETE /api/v1/projects/:projectId/files/:fileId`
* **Response (204 No Content)**: Cascading delete of file or folder.

---

### 6.3 AI & RAG Endpoints

#### `POST /api/v1/ai/review`
* **Request Body**:
```json
{
  "projectId": "73c6838a-36fb-40db-9f26-d667fb2f1559",
  "filePath": "src/auth.py",
  "code": "def verify_token(token):\n    return jwt.decode(token, verify=False)",
  "language": "python"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "summary": "Critical Security Vulnerability Detected",
    "issues": [
      {
        "type": "SECURITY",
        "severity": "CRITICAL",
        "lineRange": [1, 2],
        "message": "Signature verification is disabled (verify=False), allowing arbitrary forged JWT tokens.",
        "suggestedFix": "return jwt.decode(token, key=SECRET_KEY, algorithms=['HS256'])"
      }
    ]
  }
}
```

#### `POST /api/v1/ai/debug`
* **Request Body**:
```json
{
  "code": "def parse_data(items):\n    return items['user']['id']",
  "errorMessage": "TypeError: 'NoneType' object is not subscriptable",
  "language": "python"
}
```

#### `POST /api/v1/rag/query`
* **Description**: Project-aware retrieval-augmented prompt answering.
* **Request Body**:
```json
{
  "projectId": "73c6838a-36fb-40db-9f26-d667fb2f1559",
  "query": "Where is the database connection initialized and how are connection pools configured?"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "answer": "The database pool is initialized in `src/db/connection.ts` using `pg.Pool` with a `max: 20` connection limit...",
    "citedSources": [
      {
        "filePath": "src/db/connection.ts",
        "startLine": 12,
        "endLine": 35,
        "similarityScore": 0.884
      }
    ]
  }
}
```

#### `POST /api/v1/rag/sync`
* **Description**: Enqueues a project-wide vector indexing job in BullMQ.
* **Request Body**: `{ "projectId": "73c6838a-36fb-40db-9f26-d667fb2f1559" }`
* **Response (202 Accepted)**: `{ "jobId": "idx_991823", "status": "indexing_enqueued" }`

---

### 6.4 Code Execution Endpoint

#### `POST /api/v1/execute`
* **Request Body**:
```json
{
  "projectId": "73c6838a-36fb-40db-9f26-d667fb2f1559",
  "language": "python",
  "code": "import sys\nname = sys.stdin.readline().strip()\nprint(f'Hello, {name}!')",
  "stdin": "Niranjan"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "stdout": "Hello, Niranjan!\n",
    "stderr": "",
    "exitCode": 0,
    "executionTimeMs": 142,
    "memoryUsedBytes": 12451840,
    "status": "completed"
  }
}
```

---

## 7. Socket.IO Real-Time Engine & Event Specifications

### 7.1 Handshake Authentication
Client connects with JWT passed in handshake auth object:
```javascript
const socket = io('https://api.example.com', {
  auth: {
    token: 'Bearer eyJhbGciOi...'
  },
  transports: ['websocket', 'polling']
});
```
Server validates the token in middleware before establishing the socket session. The socket is automatically bound to `socket.data.user = { id, username }`.

---

### 7.2 Event Catalog & Data Payloads

```
CLIENT                                                           SERVER
  │                                                                │
  ├─────── 1. emit('room:join', { projectId }) ───────────────────>┤
  │<────── 2. emit('room:joined', { activeUsers, fileStates }) ────┤
  │                                                                ├────── emit to room (except sender)
  │                                                                │       'room:user_joined', { user }
  │                                                                │
  ├─────── 3. emit('editor:change', { fileId, changes, v }) ──────>┤
  │                                                                ├────── broadcast.to(roomId)
  │<────── 4. 'editor:change', { fileId, changes, userId, v } ─────┤       'editor:change'
  │                                                                │
  ├─────── 5. emit('cursor:move', { fileId, line, col }) ─────────>┤
  │<────── 6. 'cursor:update', { userId, fileId, line, col } ──────┤
  │                                                                │
  ├─────── 7. emit('chat:send', { message }) ─────────────────────>┤
  │<────── 8. 'chat:message', { id, userId, username, message } ───┤
```

#### Detailed Event Contracts:

| Event Name | Direction | Payload | Purpose |
| :--- | :--- | :--- | :--- |
| `room:join` | Client $\to$ Server | `{ projectId: string }` | Joins Socket.IO room `project:<id>`. |
| `room:joined` | Server $\to$ Client | `{ members: User[], activeFileUsers: Record<string, string[]> }` | Initial room state hydration. |
| `room:user_joined` | Server $\to$ Room | `{ user: { id: string, username: string, avatarUrl: string } }` | Presence banner notification. |
| `room:user_left` | Server $\to$ Room | `{ userId: string }` | Clean up remote cursor/presence. |
| `editor:change` | Client $\to$ Server | `{ fileId: string, changes: MonacoChange[], version: number }` | Transmits text deltas (not full content). |
| `editor:change` | Server $\to$ Client | `{ fileId: string, changes: MonacoChange[], senderId: string, version: number }` | Applies deltas in remote Monaco models. |
| `cursor:move` | Client $\to$ Server | `{ fileId: string, position: { lineNumber: number, column: number } }` | Transmits active cursor location. |
| `cursor:update` | Server $\to$ Client | `{ userId: string, username: string, color: string, position: Position }` | Renders remote Monaco cursor widget. |
| `chat:send` | Client $\to$ Server | `{ projectId: string, message: string }` | Sends new chat message. |
| `chat:message` | Server $\to$ Room | `{ id: string, userId: string, username: string, message: string, createdAt: string }` | Appends message to chat panel. |

#### Monaco Delta Structure (`MonacoChange`):
```typescript
interface MonacoChange {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  rangeOffset: number;
  rangeLength: number;
  text: string;
}
```

### 7.3 Echo Loop Prevention & Conflict Mitigation
To prevent infinite update loops and cursor disruption:
1. **Never use `io.to(roomId).emit()` for editor edits**: Always use `socket.broadcast.to(roomId).emit()` so the originating client never receives its own keystrokes back.
2. **Apply remote deltas via `model.applyEdits()`**: Never call `setValue()` on Monaco Editor during collaboration. `applyEdits` adjusts internal line markers without resetting the local user's active cursor or selection.
3. **Debounced Persistence to Database**: Instead of writing to PostgreSQL on every keystroke, the backend buffers content in Redis (`SET project:<id>:file:<id>:content <text>`) and flushes to PostgreSQL every 1.5 seconds after editing ceases.

---

## 8. RAG Architecture & Implementation Flow

```
[ Code Repository / Files ]
            │
            ▼ (Split into chunks with regex code boundaries)
[ Recursive Code Splitter (500 tokens, 80 token overlap) ]
            │
            ▼
[ OpenAI text-embedding-3-small (1536 dims) ]
            │
            ▼
[ PostgreSQL pgvector Table: code_embeddings ]
            │
            ▼ (Index with HNSW, m=16, ef_construction=64)
─────────────────────────────────────────────────────────────
[ User Query: "How does auth work?" ]
            │
            ▼
[ Query Embedding: text-embedding-3-small ]
            │
            ▼
[ Cosine Similarity Search: embedding <=> query_vector ]
  (Filtered by project_id, Score Threshold >= 0.70, Limit 5)
            │
            ▼
[ Top Retrieved Chunks + Metadata (File, Line Numbers) ]
            │
            ▼
[ Injected into Grounded LLM Prompt ]
            │
            ▼
[ OpenAI gpt-4o-mini (Streaming Response with Citations) ]
```

### 8.1 Language-Aware Chunking Strategy
Ordinary text chunkers break functions in half. We use regex-based code chunking matching top-level definitions:
* **Separators**:
  1. `\nclass `
  2. `\ndef ` / `\nfunction ` / `\nexport `
  3. `\n\n` (Double newline between blocks)
  4. `\n` (Single newline)
* **Parameters**:
  * Chunk Size: `500 tokens` (~2,000 characters)
  * Chunk Overlap: `80 tokens` (~320 characters)
* **Metadata stored per chunk**:
  * `filePath`
  * `startLine`, `endLine`
  * `tokenCount`

### 8.2 pgvector Cosine Search Query (TypeScript / SQL)
```typescript
export async function searchProjectContext(
  projectId: string,
  queryEmbedding: number[],
  limit: number = 5,
  minSimilarity: number = 0.70
) {
  const embeddingString = `[${queryEmbedding.join(',')}]`;

  const query = `
    SELECT 
      ce.id,
      f.path AS file_path,
      ce.start_line,
      ce.end_line,
      ce.chunk_content,
      1 - (ce.embedding <=> $1::vector) AS similarity_score
    FROM code_embeddings ce
    JOIN files f ON ce.file_id = f.id
    WHERE ce.project_id = $2
      AND 1 - (ce.embedding <=> $1::vector) >= $3
    ORDER BY ce.embedding <=> $1::vector ASC
    LIMIT $4;
  `;

  const result = await db.query(query, [embeddingString, projectId, minSimilarity, limit]);
  return result.rows;
}
```

---

## 9. AI Prompt Engineering & Grounding Templates

### 9.1 System Prompt for Project-Aware RAG
```text
You are an expert Senior Software Engineer acting as an embedded pair programmer inside a cloud IDE.
Your answers must be grounded strictly in the provided project code context whenever available.

PROJECT CONTEXT:
-----------------------------------------
File: {file_path} (Lines {start_line}-{end_line}):
{chunk_content}
-----------------------------------------

INSTRUCTIONS:
1. Always cite exact file names and line numbers when referencing code.
2. If the context does not contain sufficient information to answer the question, clearly state that rather than hallucinating.
3. Provide concise, clean, and idiomatic code snippets with comments.
4. Highlight any edge cases, security implications, or performance bottlenecks.
```

### 9.2 AI Code Review Prompt Template
```text
Analyze the following {language} code snippet from `{filePath}`:

```
{code}
```

Perform a rigorous code review focusing on:
1. Bugs and logic flaws
2. Security vulnerabilities (OWASP Top 10)
3. Performance and complexity issues (Big-O)
4. Clean code standards and style

Output your review strictly in the following JSON format:
{
  "summary": "Short 1-sentence overview",
  "issues": [
    {
      "type": "BUG" | "SECURITY" | "PERFORMANCE" | "STYLE",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "lineRange": [startLine, endLine],
      "message": "Clear explanation of the problem",
      "suggestedFix": "Corrected code snippet"
    }
  ]
}
```

---

## 10. Docker-Based Sandboxed Code Execution

```
[ Client "Run" Click ]
           │
           ▼
[ POST /api/v1/execute ]
           │
           ▼
[ Push Job to BullMQ (Queue: 'code-execution') ]
           │
           ▼
[ Worker Picks Up Job ]
           │
           ▼
[ Write Code to Host Temp Directory: /tmp/sandboxes/<jobId>/code.ext ]
           │
           ▼
[ Docker Engine Run via Dockerode API ]
  Flags:
  ├── Network: --network none (Zero internet access)
  ├── Memory:  --memory 128m --memory-swap 128m
  ├── CPU:     --cpus 0.50 (50% of single core)
  ├── PIDs:    --pids-limit 64 (Fork bomb protection)
  ├── User:    --user sandboxuser (UID 10001)
  ├── RootFS:  --read-only
  ├── TmpFS:   --tmpfs /tmp:rw,noexec,nosuid,size=16m
  └── Mount:   -v /tmp/sandboxes/<jobId>:/sandbox:ro
           │
           ▼
[ Enforce Execution Timeout (5000ms max) ]
           │
           ▼
[ Capture stdout, stderr, exit code, execution time ]
           │
           ▼
[ Clean Up Host Temp Directory & Destroy Container ]
           │
           ▼
[ Emit Result via Socket.IO to Client / Return HTTP Response ]
```

### 10.1 Multi-Language Sandbox Dockerfile (`sandbox.Dockerfile`)
```dockerfile
FROM alpine:3.19

# Install minimal compilers and runtimes
RUN apk add --no-cache \
    python3 \
    nodejs \
    g++ \
    gcc \
    openjdk17-jre-headless \
    bash

# Create non-root unprivileged user
RUN addgroup -g 10001 sandboxgroup && \
    adduser -u 10001 -G sandboxgroup -D -s /bin/false sandboxuser

WORKDIR /sandbox

# Restrict permissions
USER sandboxuser
```

### 10.2 Security Hardening Checklist
* **Zero Network Access (`--network none`)**: Blocks egress data exfiltration, crypto-miners, and AWS/Cloud instance metadata scraping (`http://169.254.169.254`).
* **Fork-Bomb Immunity (`--pids-limit 64`)**: Prevents malicious scripts like `:(){ :|:& };:` from freezing the host OS process table.
* **Non-Root Execution (`--user 10001:10001`)**: Prevents privilege escalation and container-escape exploits.
* **Read-Only Filesystem with Restricted Tmpfs**: Disallows tampering with system binaries or writing persistent malware on the container image.
* **Hard 5-Second Wall-Clock Timeout**: Uses a Node.js `setTimeout` linked to `container.kill({ signal: 'SIGKILL' })` to terminate infinite loops (`while(true)`).

---

## 11. Redis & S3 Infrastructure Design

### 11.1 Redis Key Naming Convention & TTL Matrix
```
┌────────────────────────────────────────┬────────┬─────────────────────────────┐
│ Key Pattern                            │ TTL    │ Purpose                     │
├────────────────────────────────────────┼────────┼─────────────────────────────┤
│ room:<projectId>:members               │ 12h    │ Set of active user IDs      │
│ user:<userId>:presence                 │ 60s    │ Heartbeat ping presence     │
│ project:<projectId>:file:<fileId>:buff │ 1.5s   │ Debounced editor buffer     │
│ ratelimit:ai:<userId>                  │ 60s    │ Max 10 AI queries / minute  │
│ ratelimit:exec:<userId>                │ 60s    │ Max 15 runs / minute        │
│ bull:code-execution:*                  │ Auto   │ BullMQ job state & results  │
└────────────────────────────────────────┴────────┴─────────────────────────────┘
```

### 11.2 AWS S3 Tiering Architecture
Active file edits are read and written to **PostgreSQL**. S3 is used for:
1. **Project Zip Archives**: Exporting a project as a downloadable `.zip` file.
2. **Periodic Snapshots**: Nightly snapshots compressed into `projects/{projectId}/snapshots/{timestamp}.tar.gz`.
3. **User Profile Pictures**: Pre-signed URLs for direct browser-to-S3 avatar uploads.

---

## 12. Recommended Folder Structure

```text
code-editor/
├── package.json
├── docker-compose.yml
├── .env.example
├── client/                     # React Frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                # Axios / Fetch client wrappers
│   │   ├── components/
│   │   │   ├── common/         # Buttons, Modals, Spinners
│   │   │   ├── editor/         # MonacoEditor.tsx, EditorHeader.tsx, LanguageSelector.tsx
│   │   │   ├── file-tree/      # FileTree.tsx, FileItem.tsx, CreateFileModal.tsx
│   │   │   ├── chat/           # ChatPanel.tsx, ChatMessage.tsx
│   │   │   ├── ai/             # AIAssistantPanel.tsx, ReviewCard.tsx, RAGSearch.tsx
│   │   │   └── terminal/       # OutputPanel.tsx, TerminalTabs.tsx
│   │   ├── hooks/              # useSocket.ts, useMonaco.ts, useAuth.ts, useDebounce.ts
│   │   ├── store/              # Zustand stores (useEditorStore, useProjectStore)
│   │   └── types/              # Shared TypeScript definitions
│   └── public/
├── server/                     # Express Backend & Socket.IO
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── app.ts              # Express configuration & middlewares
│   │   ├── config/             # DB, Redis, S3, OpenAI client configs
│   │   ├── controllers/        # authController, projectController, aiController
│   │   ├── routes/             # authRoutes, projectRoutes, aiRoutes, executeRoutes
│   │   ├── middlewares/        # authMiddleware, rateLimiter, errorHandler
│   │   ├── sockets/            # socketServer.ts, editorHandler.ts, chatHandler.ts
│   │   ├── services/           # aiService.ts, ragService.ts, s3Service.ts
│   │   └── db/                 # pool.ts, migrations/, queries/
│   ├── tsconfig.json
│   └── package.json
├── worker/                     # BullMQ Background Task Worker
│   ├── src/
│   │   ├── index.ts            # Worker consumer runner
│   │   ├── queues/             # queueDefinitions.ts
│   │   ├── jobs/               # ragIndexerJob.ts, codeExecutionJob.ts
│   │   └── sandbox/            # dockerRunner.ts, securityLimits.ts
│   └── package.json
└── docker-runtimes/            # Isolated Execution Images
    ├── Dockerfile.sandbox
    └── build-sandboxes.sh
```

---

## 13. Practical Deployment Blueprint ($0 - $10/mo Student Budget)

```
[ Frontend: Vercel / Netlify ]
  ├── Fast global CDN distribution
  ├── Free SSL certificates
  └── Auto-deploy on git push

[ Backend & Socket.IO: Render Web Service / Railway ]
  ├── Node.js 20 runtime with persistent WebSockets
  ├── Environment Variables: JWT_SECRET, DATABASE_URL, REDIS_URL
  └── Autoscaling or standard tier

[ Database: Neon / Supabase (Free Tier) ]
  ├── Managed PostgreSQL 16
  ├── Native pgvector support enabled out of the box
  └── Connection pooling via PgBouncer

[ Redis: Upstash (Serverless Free Tier) ]
  ├── Pay-as-you-go / Free 10,000 commands/day
  └── Fully compatible with Socket.IO Redis Adapter

[ Sandboxed Code Execution Worker ]
  ├── Option A (Local Demo): Worker runs on developer machine targeting local Docker daemon.
  ├── Option B (Cloud Deployment): A single $5/month VPS (DigitalOcean / Hetzner) running
  │   Ubuntu + Docker daemon where the BullMQ worker container accesses `/var/run/docker.sock`.
  └── Option C (Pure Free Cloud Alternative): External integration with Judge0 CE public API.
```

---

## 14. Step-by-Step Implementation Roadmap (4-Week Schedule)

```
WEEK 1: Initialization, Foundation, Auth & Workspace
├── Day 0: Project Initialization (Monorepo folder structure, Git, Docker Compose for Postgres/Redis/MinIO, .env contracts).
├── Day 1-2: PostgreSQL setup with pgvector extension, complete schema migrations.
├── Day 3-4: Node.js/Express backend setup, JWT authentication, Zod validation.
└── Day 5-7: React + Tailwind + File Explorer UI, Project CRUD APIs, state stores.

WEEK 2: Monaco Editor & Socket.IO Real-Time Engine
├── Day 8-9: Monaco Editor integration, multi-tab active file switcher.
├── Day 10-12: Socket.IO server, room management, delta-based change broadcasts.
└── Day 13-14: Remote user presence indicator, cursor tracking, live room chat.

WEEK 3: Sandboxed Execution & Basic AI Assistant
├── Day 15-17: BullMQ job queue setup, Dockerode sandbox runner with strict flags.
├── Day 18-19: Language support (Python, JS, C++), execution output terminal panel.
└── Day 20-21: OpenAI API integration for single-file Review, Debug, and Explain.

WEEK 4: pgvector RAG Pipeline, Polish & Deployment
├── Day 22-24: Recursive code chunking, vector embedding storage, cosine search.
├── Day 25-26: Project-aware RAG chat panel with file citations and line links.
└── Day 27-28: Production deployment (Vercel + Render + Supabase), end-to-end testing.
```

---

## 15. Key Technical Decisions & Trade-Off Analysis

### 1. Socket.IO vs Raw WebSockets
* **Decision**: Selected **Socket.IO**.
* **Trade-off**: Socket.IO has a tiny protocol overhead over raw WebSockets (~1KB framing), but provides built-in room multiplexing, reconnection logic, heartbeat ping/pong, and the `@socket.io/redis-adapter` for multi-server broadcasting out of the box, saving weeks of boilerplate.

### 2. PostgreSQL + pgvector vs Dedicated Vector DB (Pinecone/Milvus)
* **Decision**: Selected **PostgreSQL + pgvector**.
* **Trade-off**: Pinecone offers managed vector clustering for billion-scale vectors, but requires synchronizing state across two separate databases. For an IDE with tens of thousands of code chunks per project, pgvector delivers sub-10ms HNSW query latency while supporting relational transactions and cascade deletions with zero architectural overhead.

### 3. In-Database File Content vs Direct S3 Read/Write
* **Decision**: Selected **PostgreSQL `content TEXT` column for active files, S3 for archives**.
* **Trade-off**: Storing text files in PostgreSQL uses database disk space, but eliminates the 200ms latency of S3 GET requests during file navigation and allows atomic relational transactions when creating, renaming, or deleting project folders.

### 4. Custom Delta Broadcasting vs Full Yjs CRDT
* **Decision**: Selected **Monaco Delta Operations with Optimistic Local Apply for MVP, with Yjs as an Advanced Roadmap extension**.
* **Trade-off**: Full CRDTs (Yjs/Automerge) guarantee mathematical eventual consistency under heavy asynchronous edits, but introduce significant memory overhead and complex binary encoding. For pair-programming with 2–5 collaborators per room, versioned delta broadcasting with Monaco decorations provides an intuitive experience with straightforward debugging.

---

## 16. Resume & Interview Preparation Guide

### 16.1 High-Impact Resume Bullet Points
* **Real-Time Distributed System**: *“Architected a real-time collaborative cloud IDE supporting concurrent multi-user code editing with sub-50ms latency using Node.js, Socket.IO, and Monaco Editor deltas, backed by Redis Pub/Sub for horizontal scaling.”*
* **Containerized Security & Sandboxing**: *“Engineered a secure multi-language code execution engine using Dockerode and BullMQ, enforcing zero network egress (`--network none`), 128MB memory ceilings, and 0.5 CPU quotas to neutralize RCE and fork-bomb vulnerabilities.”*
* **Project-Aware RAG & AI Engineering**: *“Built a project-level RAG pipeline using PostgreSQL and pgvector to index repository code chunks via OpenAI embeddings, delivering grounded AI code reviews and root-cause debugging with exact file citations.”*
* **Full-Stack Architecture**: *“Engineered a full-stack platform utilizing React, TypeScript, Tailwind CSS, PostgreSQL, and AWS S3, implementing RBAC project permissions, debounced database persistence, and automated CI/CD pipelines.”*

### 16.2 Essential Technical Interview Q&A

#### Q1: How do you prevent keystroke echo loops and cursor jumps in real-time Monaco synchronization?
> **Answer**: When a user types, Monaco fires an `onDidChangeModelContent` event containing delta changes (range, text, offset). We send this delta to the backend along with a monotonic version number. The server uses `socket.broadcast.to(roomId).emit()` to broadcast the delta to everyone *except* the sender. Remote clients apply the delta using Monaco's `model.applyEdits()`, which updates the buffer in-place without resetting user selection or cursor position. We never call `model.setValue()`.

#### Q2: What security measures prevent a malicious user from compromising the host server during code execution?
> **Answer**: We isolate user code execution inside dedicated unprivileged containers using Dockerode. We enforce `--network none` to prevent internet communication and metadata endpoint access, set `--memory 128m` and `--memory-swap 128m` to prevent OOM exhaustion on the host, configure `--pids-limit 64` to prevent fork bombs, set `--read-only` root filesystem with a transient 16MB tmpfs mount, execute as a non-root UID (10001), and terminate containers with a hard 5-second wall-clock SIGKILL timer.

#### Q3: Why use pgvector instead of a dedicated vector database like Pinecone?
> **Answer**: Using pgvector avoids the dual-write problem and eliminates the need to synchronize data between a relational database and a third-party vector store. When a project or file is deleted, PostgreSQL `ON DELETE CASCADE` automatically purges the corresponding embeddings. Furthermore, pgvector’s HNSW indexing provides sub-10ms nearest-neighbor retrieval for project-scoped queries while keeping infrastructure costs minimal.

#### Q4: How would you scale Socket.IO across multiple server instances?
> **Answer**: By default, Socket.IO stores room memberships in memory on a single process. To scale horizontally across multiple instances behind a load balancer, we integrate `@socket.io/redis-adapter` with a Redis cluster. Broadcast events are published to Redis Pub/Sub channels, allowing instances to forward real-time edits to all connected room members regardless of which server instance holds the client's WebSocket connection. We also configure the load balancer for sticky sessions based on IP or cookie.
