# CodeSync AI — Environment Configuration Specification

> **Document Version**: 1.0.0  
> **Target Audience**: DevOps engineers, cloud architects, and platform developers deploying CodeSync AI.

---

## 1. Overview & Architectural Hierarchy

CodeSync AI enforces strict environment isolation across its three core workspace components:

1. **Frontend Client (`client/.env`)**: Static environment variables bundled by Vite at build time. Variables must be prefixed with `VITE_`.
2. **Backend API Server (`server/.env`)**: Runtime configuration for the Express HTTP server, Socket.IO real-time engine, PostgreSQL connection pool, and AI integrations.
3. **Background Worker (`worker/.env`)**: Runtime configuration for BullMQ job processor, Redis queue listeners, and sandboxed Docker runner.

---

## 2. Master Environment Matrix

| Variable | Workspace | Type | Required in Prod? | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `server`, `worker` | String | **Yes** | `production` | Enables production security optimizations, error masking, and rate limiting. |
| `PORT` | `server` | Integer | No (Provider sets) | `5000` | Port on which Express & Socket.IO bind to `0.0.0.0`. |
| `CLIENT_URL` | `server` | String | **Yes** | `https://codesync.yourdomain.com` | Allowed CORS origins for REST and Socket.IO handshakes. Supports comma-separated list. |
| `DATABASE_URL` | `server`, `worker` | URI | **Yes** | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string with `pgvector` and `uuid-ossp` installed. |
| `REDIS_URL` | `server`, `worker` | URI | Optional / Rec. | `redis://default:token@host:6379` | Redis connection for BullMQ asynchronous task queues and Socket.IO scaling. |
| `JWT_ACCESS_SECRET` | `server` | String | **Yes** | Min 32 random characters | HMAC SHA-256 secret for short-lived access tokens. |
| `JWT_REFRESH_SECRET`| `server` | String | **Yes** | Min 32 random characters | HMAC SHA-256 secret for long-lived refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | `server` | String | No | `15m` | Access token time-to-live. |
| `JWT_REFRESH_EXPIRES_IN` | `server` | String | No | `7d` | Refresh token time-to-live. |
| `OPENAI_API_KEY` | `server`, `worker` | String | Optional | `sk-proj-...` | API Key for AI pairing (Code Review, Debugger, Explainer) and RAG embeddings. |
| `OPENAI_BASE_URL`| `server` | URL | No | `https://api.groq.com/openai/v1` | Optional override for alternative providers (Groq, Gemini, OpenRouter). |
| `OPENAI_MODEL` | `server` | String | No | `gpt-4o-mini` | LLM model identifier. |
| `AWS_REGION` | `server` | String | No | `us-east-1` | AWS S3 region for project snapshot backups. |
| `AWS_ACCESS_KEY_ID` | `server` | String | No | `AKIA...` | AWS IAM access key with S3 PutObject / GetObject permissions. |
| `AWS_SECRET_ACCESS_KEY` | `server` | String | No | `wJalr...` | AWS IAM secret key. |
| `AWS_S3_BUCKET` | `server` | String | No | `codesync-snapshots` | S3 bucket name. |
| `AWS_S3_ENDPOINT`| `server` | URL | No | `http://localhost:9000` | S3 endpoint override (used for local MinIO or Cloudflare R2). |
| `AWS_S3_FORCE_PATH_STYLE` | `server` | Boolean | No | `false` | Set `true` only when using MinIO. |
| `DOCKER_SOCKET_PATH` | `worker` | Path | No | `/var/run/docker.sock` | Path to host Docker daemon socket. |
| `WORKER_CONCURRENCY` | `worker` | Integer | No | `5` | BullMQ worker concurrency slots. |
| `VITE_API_URL` | `client` | URL | **Yes** | `https://api.codesync.yourdomain.com/api/v1` | Base REST API URL consumed by React frontend. |
| `VITE_SOCKET_URL` | `client` | URL | **Yes** | `https://api.codesync.yourdomain.com` | Socket.IO server URL consumed by browser client. |

---

## 3. Production Validation & Security Rules

### 3.1 Startup Fail-Fast Checks
When `NODE_ENV=production`, the server runs `validateProductionEnv()` during bootstrapping and halts (`process.exit(1)`) if:
* `DATABASE_URL` is missing or undefined.
* `JWT_ACCESS_SECRET` is undefined, shorter than 32 characters, or contains `"fallback"` / `"super_secret"`.
* `JWT_REFRESH_SECRET` is undefined, shorter than 32 characters, or contains `"fallback"` / `"super_secret"`.

### 3.2 CORS Strictness
* **Development**: Wildcard origins (`*`) and dynamic LAN IP translation are enabled to allow easy multi-device testing over local Wi-Fi (`172.20.x.x`).
* **Production**: `cors` in Express and `cors.origin` in Socket.IO strictly validate against the comma-separated domains defined in `CLIENT_URL`. All unauthorized origins are rejected with HTTP 403 / Handshake rejection.

---

## 4. Generating Cryptographic Secrets

Generate high-entropy 64-character hex strings for your production JWT secrets:

```bash
# In Bash or PowerShell using OpenSSL / Node:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
