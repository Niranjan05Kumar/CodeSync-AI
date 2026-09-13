# AGENT INSTRUCTIONS & ARCHITECTURAL GUARDRAILS
## Project: CodeSync AI (Real-Time Collaborative Cloud Code Editor)

> **Project Name**: CodeSync AI  
> **Note**: This file is maintained alongside `AGENTS.md` to ensure full compatibility with all agent environments.

Please refer to the comprehensive guidelines and specifications:
- **[AGENTS.md](file:///d:/CodeEditor/AGENTS.md)**: Primary agent rules, anti-patterns, phase roadmap, security checklist, and environment variables.
- **[FINAL_TECHNICAL_REPORT.md](file:///d:/CodeEditor/FINAL_TECHNICAL_REPORT.md)**: Technical architecture, database schemas, REST APIs, Socket.IO events, Docker sandbox, and RAG design.
- **[UI_DESIGN.md](file:///d:/CodeEditor/UI_DESIGN.md)**: VS Code Dark Modern design tokens, pixel layout geometry, and Monaco Editor setup.

---

### Quick Rules for Any AI Agent Working on This Project

1. **Follow the Sequential Phases**:
   - **Phase 0**: Project Initialization & Environment Setup
   - **Phase 1**: Database Foundation & Vector Schema (PostgreSQL + pgvector)
   - **Phase 2**: Backend REST APIs & Authentication (Node.js, Express, JWT, Zod)
   - **Phase 3**: Frontend Shell & File Management (React, Tailwind, Workspace, Tree)
   - **Phase 4**: Monaco Editor Integration (Embedding, vs-dark theme, tabs)
   - **Phase 5**: Real-Time Collaboration & Presence (Socket.IO deltas, cursors, chat)
   - **Phase 6**: Sandboxed Code Execution Engine (BullMQ, Dockerode, security isolation)
   - **Phase 7**: Basic AI Assistant (OpenAI API single-file Review, Debug, Explain)
   - **Phase 8**: Project-Aware RAG Pipeline (Code chunking, embeddings, pgvector search)
   - **Phase 9**: Production Hardening & Cloud Deployment

2. **Strict Real-Time Delta Synchronization**:
   - Never broadcast full-file text on keystroke. Always transmit Monaco delta change objects (`range`, `rangeOffset`, `text`, `versionId`).
   - Use `socket.broadcast.to(roomId).emit()` (never send back to the sender).
   - Apply remote edits with Monaco's `model.applyEdits()`. Never call `model.setValue()`.
   - Debounce database persistence (1.5s) via Redis buffer.

3. **Two-Tier Storage Architecture**:
   - Active file contents live directly in PostgreSQL `files.content TEXT` with Redis caching.
   - S3 is reserved exclusively for project ZIP export archives, periodic snapshots, and user avatars. Never make synchronous S3 calls on keystrokes.

4. **Code Execution Isolation**:
   - Never run `docker run` inside Express route handlers. Always push jobs to BullMQ queue and process via worker.
   - Enforce: `--network none`, `--memory 128m`, `--cpus 0.50`, `--pids-limit 64`, `--read-only`, unprivileged user `10001:10001`, and a hard 5-second `SIGKILL` timeout.

5. **Design System & Aesthetics**:
   - Follow `UI_DESIGN.md`. VS Code Dark theme (`#181818`, `#1e1e1e`, `#1f1f1f`, `#252526`), VS Code Blue (`#007acc`), JetBrains Mono for code, Inter for UI.
   - Zero marketing fluff, no neon gradients, no glassmorphism.
