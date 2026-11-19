# Railway deployment notes

These notes preserve the official references used while preparing the deployment files.

- Railway Config as Code reference: https://docs.railway.com/config-as-code/reference
  - `railway.json` can set Dockerfile builder/path, start command, pre-deploy command, healthcheck path/timeout, restart policy, and draining seconds.
  - Railway currently marks Config as Code deprecated in favor of Infrastructure as Code, but existing config files remain supported through 2026-12-01.
- Railway deployment reference: https://docs.railway.com/deployments/reference
  - A deployment with a healthcheck becomes Active after the healthcheck succeeds.
  - Railway may restart or migrate deployments, so application data must not live only on the container filesystem or process memory.
- Railway PostgreSQL guide: https://docs.railway.com/guides/postgresql
  - PostgreSQL exposes `DATABASE_URL` and the PG* variables to services in the same project.
  - The database is private by default; external access requires explicit public networking.
  - Backups, monitoring, and connection pooling should be considered for production.
