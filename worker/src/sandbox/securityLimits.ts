/**
 * Mandatory Execution Sandbox Security Limits
 * Strictly defined by AGENTS.md Section 3.3 & FINAL_TECHNICAL_REPORT.md Section 10
 */
export const SECURITY_LIMITS = {
  // Execution wall-clock timeout (5000ms max)
  TIMEOUT_MS: 5000,

  // Memory limits (128MB RAM, 128MB Swap)
  MEMORY_BYTES: 128 * 1024 * 1024,
  MEMORY_SWAP_BYTES: 128 * 1024 * 1024,

  // CPU quota (50% of a single core)
  NANO_CPUS: 500_000_000,

  // Maximum process table limit to neutralize fork-bombs
  PIDS_LIMIT: 64,

  // Output buffer ceiling (truncate stdout/stderr to 64KB)
  OUTPUT_CEILING_BYTES: 64 * 1024,

  // Unprivileged user UID:GID
  USER: '10001:10001',

  // Scratch tmpfs size (16MB in-memory transient scratchpad)
  TMPFS: {
    '/tmp': 'rw,noexec,nosuid,size=16m'
  }
};
