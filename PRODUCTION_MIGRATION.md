# CricIt — Production Migration Guide

A living document tracking every configuration, secret, and infrastructure difference between the **local/dev** environment and **production**. Update this file whenever a new service, secret, or infra dependency is added.

---

## 1. Environment Variables

### `apps/client/.env`

| Variable | Local / Dev | Production | Notes |
|----------|-------------|------------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | Dev Supabase project URL | Prod Supabase project URL | Separate Supabase projects for dev and prod |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Dev anon key | Prod anon key | Never commit to VCS; use CI secrets |

### `apps/api/.env`

| Variable | Local / Dev | Production | Notes |
|----------|-------------|------------|-------|
| `DATABASE_URL` | `postgresql://cricit:cricit_local@localhost:5432/cricit_dev?schema=public` | AWS RDS connection string | Use connection pooling (PgBouncer / RDS Proxy) |

---

## 2. Infrastructure Services

All local services run via `docker-compose up -d`. Production equivalents need to be provisioned separately.

| Service | Local (Docker Compose) | Production (AWS) | Status |
|---------|------------------------|-------------------|--------|
| **PostgreSQL** | `postgres:16-alpine` on `localhost:5432` | Supabase managed PostgreSQL (or AWS RDS) | 🟡 Dev Supabase project exists |
| **Redis** | `redis:7-alpine` on `localhost:6379` | AWS ElastiCache | 🔴 Not yet provisioned |
| **Object Storage** | MinIO on `localhost:9000` (console: `9001`) | AWS S3 | 🔴 Not yet provisioned |

### Local Docker Credentials (for reference)

| Service | User | Password |
|---------|------|----------|
| PostgreSQL | `cricit` | `cricit_local` |
| MinIO | `admin` | `password123` |

---

## 3. Authentication (Supabase Auth)

| Setting | Local / Dev | Production |
|---------|-------------|------------|
| Supabase project | Dev project | Separate prod project |
| Email verification | Enabled (Supabase default) | Enabled |
| Google OAuth | 🔴 Not configured yet | 🔴 Not configured yet |
| Redirect URIs | `http://localhost:8082` | App domain / deep link scheme |

### Supabase Dashboard Checklist (Prod)

- [ ] Create a separate Supabase project for production
- [ ] Enable email auth provider
- [ ] Configure email templates (verification, password reset)
- [ ] Set up custom SMTP (optional, for branded emails)
- [ ] Configure Google OAuth provider (when ready)
- [ ] Add production redirect URIs
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create database triggers to sync `auth.users` → `public.User` if needed

---

## 4. Database Migrations (Prisma)

| Command | Purpose |
|---------|---------|
| `npm run db:migrate` | Run Prisma migrations against the database pointed to by `DATABASE_URL` |
| `npm run db:studio` | Open Prisma Studio for visual data inspection |

### Production Migration Steps

1. Set `DATABASE_URL` to the production connection string
2. Run `npx prisma migrate deploy` (not `migrate dev`) in the API directory
3. Verify with `npx prisma studio` or direct SQL

> **⚠️ Never run `prisma migrate dev` against production.** Use `prisma migrate deploy` which only applies pending migrations without generating new ones.

---

## 5. Deployment

| Component | Local | Production |
|-----------|-------|------------|
| **API (NestJS)** | `nest start --watch` on `localhost:3000` | AWS ECS Fargate (behind ALB) |
| **Client (Expo)** | `expo start --web --port 8082` | EAS Build (iOS/Android) + Expo Web export |

### Deployment Checklist

- [ ] Set up AWS CDK stack (ECS, ALB, RDS, ElastiCache)
- [ ] Configure CI/CD pipeline (GitHub Actions / similar)
- [ ] Set all env vars in ECS task definitions / EAS secrets
- [ ] Set up SSL/TLS certificates
- [ ] Configure custom domain
- [ ] Set up monitoring and alerting

---

## 6. Secrets Management

| Secret | Where Stored (Dev) | Where Stored (Prod) |
|--------|--------------------|---------------------|
| Supabase URL & Key | `.env` file (gitignored) | CI/CD secrets / AWS Secrets Manager |
| Database URL | `.env` file (gitignored) | ECS task definition env / Secrets Manager |
| MinIO / S3 keys | `docker-compose.yml` (local only) | IAM roles (no explicit keys needed on ECS) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-22 | Initial doc — Supabase auth (email/password), local Docker infra, Prisma DB |
