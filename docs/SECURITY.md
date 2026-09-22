# CodeSync AI — Security Posture & Architecture Guide

> **Document Version**: 1.0.0  
> **Status**: Production Hardened  

---

## 1. Authentication & Authorization

### 1.1 Dual-Token JWT Architecture
* **Access Tokens**: Short-lived (15 minutes), signed using HMAC SHA-256 (`HS256`) with a cryptographically random secret of at least 32 characters. Carried in the HTTP `Authorization: Bearer <token>` header or Socket.IO handshake auth.
* **Refresh Tokens**: Long-lived (7 days), signed using an independent secret key. Stored client-side in localStorage and automatically exchanged upon HTTP `401 Unauthorized` responses without user disruption.
* **Fail-Fast Defense**: In production (`NODE_ENV=production`), the application refuses to start if placeholder or weak secrets are detected.

### 1.2 Password Hashing
* Passwords are never stored in plaintext.
* Hashed using **bcryptjs** with 10 salt rounds before database persistence.

### 1.3 Project-Level RBAC (Role-Based Access Control)
* Every project access check is evaluated against `project_members` and `projects.owner_id`.
* Supported roles:
  * `owner`: Full privileges including project deletion and member management.
  * `editor`: Can create, edit, delete files, and run code within the project.
  * `viewer`: Read-only access to source code and active collaboration channels.
* Non-members attempting to access private projects receive standard `403 Forbidden` / `404 Not Found` responses.

---

## 2. Sandboxed Code Execution Isolation

The CodeSync execution engine isolates user-submitted scripts to prevent host compromise, denial-of-service, and network exfiltration.

### 2.1 Mandatory Docker Security Constraints
When running inside Docker containers (`codesync-sandbox:latest`), the following security boundaries are enforced:

| Flag | Parameter | Security Objective |
| :--- | :--- | :--- |
| **Network Disabled** | `--network none` | Prevents data exfiltration, reverse shells, and AWS metadata scraping (`169.254.169.254`). |
| **Memory Limit** | `--memory 128m --memory-swap 128m` | Prevents Out-Of-Memory (OOM) exhaustion on the host node. |
| **CPU Core Quota** | `--cpus 0.50` | Restricts container to a maximum of 50% of a single CPU core. |
| **PID Limit** | `--pids-limit 64` | Neutralizes fork-bomb attacks (`:(){ :|:& };:`). |
| **Read-Only Root Filesystem**| `--read-only` | Prevents filesystem tampering, rootkit installations, and persistence. |
| **Transient Scratchpad** | `--tmpfs /tmp:rw,noexec,nosuid,size=16m` | In-memory temporary scratchpad that evaporates when the container terminates. |
| **Unprivileged User** | `--user 10001:10001` (`sandboxuser`) | Runs as an unprivileged UID/GID without root or sudo privileges. |
| **Hard Timeout** | `5000ms` via `SIGKILL` | Wall-clock timer terminates infinite loops (`while True: pass`). |
| **Output Ceiling** | `64 KB` | Truncates stdout/stderr buffers to prevent client and server memory bloat. |

### 2.2 Workstation Subprocess Fallback
When Docker is not available on local developer workstations, execution falls back to a subprocess runner that still enforces the 5-second `SIGKILL` timeout and 64KB buffer truncation.

---

## 3. Database Security & Vector Isolation

### 3.1 Parameterized SQL Queries
* All queries in `server/src/db/pool.ts` use PostgreSQL parameterized placeholders (`$1, $2, ...`).
* Template literal string interpolation is strictly forbidden to prevent SQL injection vulnerabilities.

### 3.2 Strict Project Isolation in pgvector / RAG Queries
Vector cosine distance queries in `ragService.ts` explicitly filter by `project_id` before performing distance calculations:

```sql
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
```
This guarantees that semantic similarity searches never leak code chunks from one project to another.

---

## 4. Network & HTTP Security Headers

### 4.1 Helmet Protection
* Content Security Policy managed for Monaco Editor web workers.
* Cross-Origin Resource Policy: `cross-origin`.
* `X-Content-Type-Options: nosniff`.
* `X-Frame-Options: SAMEORIGIN`.
* `Strict-Transport-Security` (HSTS enabled in production).

### 4.2 Rate Limiting
* **Global API Limiter**: 100 requests per 15 minutes per IP.
* **Compute & AI Limiter**: 20 requests per minute per IP for intensive endpoints (`/api/v1/execute`, `/api/v1/ai/*`, `/api/v1/rag/*`).

---

## 5. Known Limitations & Recommendations

1. **Docker Container Multi-Tenancy**: Docker container isolation is a project-level sandbox. For enterprise-grade untrusted multi-tenant execution, deploying **gVisor (runsc)** or **AWS Firecracker microVMs** is recommended.
2. **WebSocket Sticky Sessions**: When scaling Socket.IO across multiple server instances behind an AWS ALB or Nginx, sticky sessions (session affinity cookies) must be configured so WebSocket upgrade requests land on the same container.
