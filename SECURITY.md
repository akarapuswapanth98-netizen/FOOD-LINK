# Security policy

- **No secrets in source.** API keys live only in local `.env` files, which are
  gitignored (root `.gitignore`, `frontend/.gitignore`). Only `.env.example`
  files with placeholder values are committed.
- **Key handling:** the backend reads keys from the environment at startup
  (`app/core/config.py`) and never logs them (`routes_health.py` reports only a
  boolean `llm_configured` flag).
- **Demo safety:** `POST /api/foodbridge/demo/reset` is a rehearsal convenience
  with no auth — enable auth or disable the route before any production use.
- **Reporting:** open a GitHub issue for suspected vulnerabilities; do not
  commit proofs-of-concept containing real credentials.
