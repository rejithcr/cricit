# CricIt — Cricket Community & Live Scoring App

A platform for managing cricket teams, building community, organizing tournaments, and delivering real-time live scoring — starting lean on AWS and scaling as the user base grows.

---

## 1. Functional Requirements Recap

| # | Feature Area | Key Capabilities |
|---|---|---|
| 1 | **Team Management** | Create/edit teams, manage rosters, player profiles, roles (captain, admin), invite players |
| 2 | **Community** | Feed/posts, team discovery, follow teams, comments, notifications, chat |
| 3 | **Tournaments** | Create tournaments (knockout/league/group+knockout), scheduling, fixtures, points tables, results |
| 4 | **Live Scoring** | Ball-by-ball scoring UI, real-time score broadcast to spectators, scorecard, wagon wheel, Manhattan chart |

## 2. Non-Functional Requirements

| Concern | Target |
|---|---|
| Initial users | 10–200 (MVP) |
| Infrastructure | AWS, minimal cost, horizontally scalable |
| Clients | Mobile (Android + iOS) + Web |
| Latency (live scoring) | < 500 ms end-to-end for score updates |
| Availability | 99.5 %+ (non-critical startup phase) |
| Cost | < $50/month at launch, scaling linearly |

---

## 3. Proposed Tech Stack

### 3.1 Frontend — Cross-Platform

| Layer | Technology | Why |
|---|---|---|
| **Mobile** | **React Native (Expo)** | Single codebase for Android + iOS; large ecosystem; Expo simplifies builds, OTA updates, push notifications |
| **Web** | **Next.js 14+ (App Router)** | SSR/SSG for SEO (tournament pages, player profiles), React Server Components, shared component library with mobile via React Native Web |
| **Shared UI** | **React Native Web + Tamagui** or **Nativewind (TailwindCSS for RN)** | Maximize code sharing between web and mobile; consistent design system |
| **State Management** | **TanStack Query (React Query)** | Server-state caching, optimistic updates, real-time refetch — perfect for live scoring |
| **Real-time (client)** | **Socket.IO Client** or **AWS IoT MQTT over WebSocket** | Subscribe to live score channels |
| **Charts** | **Victory Native / Recharts (web)** | Wagon wheel, Manhattan chart, run-rate graphs |

> [!TIP]
> **Alternative (simpler start):** Use **Flutter** instead of React Native if your team is more comfortable with Dart. Flutter's single-codebase story for mobile + web is more mature, though the web output is heavier.

---

### 3.2 Backend — API & Services

| Layer | Technology | Why |
|---|---|---|
| **Runtime** | **Node.js 24 LTS (TypeScript)** | Latest LTS (v24 "Krypton"), supported until April 2028; same language as frontend; excellent real-time support |
| **API Framework** | **NestJS** | Modular architecture, built-in WebSocket gateway, guards/interceptors, OpenAPI generation, scales well with team size |
| **ORM** | **Prisma** | Type-safe database access, migrations, excellent DX |
| **Real-time** | **Socket.IO** (on NestJS WebSocket Gateway) | Rooms per match for live scoring broadcast; auto-fallback from WebSocket to long-polling |
| **Auth** | **AWS Cognito** (or **Clerk** / **Supabase Auth** for faster setup) | OAuth2 + social logins (Google), JWT, user pools, free tier covers 50K MAUs |
| **File Storage** | **AWS S3 + CloudFront CDN** | Team logos, player photos, tournament banners |
| **Push Notifications** | **AWS SNS** + **Expo Push Notifications** | Match start alerts, score milestones, tournament updates |

> [!IMPORTANT]
> **Monorepo recommended.** Use **Turborepo** or **Nx** to manage `apps/web`, `apps/mobile`, `packages/api-client`, `packages/shared-types`, and `packages/ui` in one repo. This dramatically reduces type drift between frontend and backend.

---

### 3.3 Database

| Store | Technology | Purpose |
|---|---|---|
| **Primary DB** | **PostgreSQL (AWS RDS — db.t4g.micro)** | Teams, players, tournaments, fixtures, scorecards — relational data with complex joins |
| **Cache / Pub-Sub** | **Redis (AWS ElastiCache — cache.t4g.micro)** | Live score state, session cache, leaderboard rankings, Socket.IO adapter for multi-instance pub/sub |
| **Search** (future) | **OpenSearch (or Algolia)** | Player/team search, full-text search on posts |

> [!TIP]
> **Cost-saving at launch:** Use **Supabase** (hosted Postgres + Auth + Realtime + Storage) instead of raw AWS RDS. It has a generous free tier and you can migrate to self-hosted Postgres later. Or use **Neon** (serverless Postgres) for a $0 start.

---

### 3.4 Local Development Setup

Everything runs locally with a single command. No AWS dependency during development.

#### 3.4.1 Docker Compose — Full Local Stack

All infrastructure services (Postgres, Redis) and optionally the app services run via Docker Compose:

```yaml
# docker-compose.yml (root of monorepo)
version: "3.9"

services:
  # ─── Infrastructure Services ───────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: cricit-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: cricit_dev
      POSTGRES_USER: cricit
      POSTGRES_PASSWORD: cricit_local
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cricit"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cricit-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # ─── Optional: S3-compatible local storage ─────────────
  minio:
    image: minio/minio:latest
    container_name: cricit-minio
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # Web console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  # ─── App Services (for full-stack Docker testing) ──────
  backend:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: cricit-api
    ports:
      - "3001:3001"
      - "3002:3002"    # WebSocket port
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://cricit:cricit_local@postgres:5432/cricit_dev
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET=cricit-media
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - JWT_SECRET=local-dev-secret
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    profiles: ["full"]   # only starts with: docker compose --profile full up

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: cricit-web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
      - NEXT_PUBLIC_WS_URL=http://localhost:3002
    depends_on:
      - backend
    profiles: ["full"]

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

#### 3.4.2 Local Development Modes

| Mode | Command | What Runs in Docker | What Runs Natively | Best For |
|---|---|---|---|---|
| **Infra-only** (recommended) | `docker compose up` | Postgres, Redis, MinIO | Backend (NestJS), Web (Next.js), Mobile (Expo) via `npm run dev` | Day-to-day development — hot reload on all app code |
| **Full-stack Docker** | `docker compose --profile full up` | Everything | Nothing (except mobile via Expo) | Testing production-like setup, CI, new developer onboarding |
| **Mobile + API** | `docker compose up` + `npm run dev --filter=api` + `npx expo start` | Postgres, Redis, MinIO | API + Mobile | Mobile-focused development |

#### 3.4.3 One-Command Startup Scripts

```jsonc
// package.json (root)
{
  "scripts": {
    "dev": "docker compose up -d && turbo run dev --parallel",
    "dev:infra": "docker compose up -d",
    "dev:api": "turbo run dev --filter=api",
    "dev:web": "turbo run dev --filter=web",
    "dev:mobile": "cd apps/mobile && npx expo start",
    "dev:stop": "docker compose down",
    "dev:reset": "docker compose down -v && docker compose up -d",
    "db:migrate": "turbo run db:migrate --filter=api",
    "db:seed": "turbo run db:seed --filter=api",
    "db:studio": "turbo run db:studio --filter=api"
  }
}
```

**Typical developer workflow:**
```bash
# First time setup
npm install
npm run dev:infra          # Start Postgres + Redis + MinIO
npm run db:migrate         # Run Prisma migrations
npm run db:seed            # Seed sample data (teams, players, tournaments)

# Daily development
npm run dev                # Starts infra + all apps with hot reload

# Or run services individually
npm run dev:infra          # Infrastructure only
npm run dev:api            # Backend on http://localhost:3001
npm run dev:web            # Web on http://localhost:3000
npm run dev:mobile         # Expo dev server
```

#### 3.4.4 Environment Configuration

Each app has `.env.local` (gitignored) that overrides `.env.example` (committed):

```
monorepo/
├── .env.example                 # Shared defaults (committed)
├── apps/
│   ├── api/
│   │   ├── .env.example         # API defaults (committed)
│   │   ├── .env.local           # Local overrides (gitignored)
│   │   └── .env.test            # Test env (committed)
│   ├── web/
│   │   ├── .env.example
│   │   └── .env.local
│   └── mobile/
│       ├── .env.example
│       └── .env.local
```

**API `.env.example`:**
```env
# Database
DATABASE_URL=postgresql://cricit:cricit_local@localhost:5432/cricit_dev

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=local-dev-secret-change-in-prod
JWT_EXPIRES_IN=7d

# Storage (MinIO locally, S3 in AWS)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=cricit-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# App
PORT=3001
WS_PORT=3002
NODE_ENV=development
```

> [!TIP]
> **MinIO** is an S3-compatible object store that runs locally. Your code uses the same AWS S3 SDK — no conditional logic needed. Just swap the endpoint URL per environment.

---

### 3.5 AWS Infrastructure — Dev & Prod Environments

#### 3.5.1 Environment Architecture

```mermaid
graph TB
    subgraph "Developer Machine"
        L1["Docker Compose"]
        L2["Postgres + Redis + MinIO"]
        L3["NestJS + Next.js + Expo"]
        L1 --> L2
        L1 --> L3
    end

    subgraph "AWS — Dev Environment"
        D_ALB["ALB<br/>(dev.cricit.com)"]
        D_ECS["ECS Fargate<br/>(1 task, 0.25 vCPU)"]
        D_RDS["RDS Postgres<br/>(db.t4g.micro)"]
        D_REDIS["ElastiCache Redis<br/>(cache.t4g.micro)"]
        D_S3["S3 Bucket<br/>(cricit-media-dev)"]
        D_ALB --> D_ECS
        D_ECS --> D_RDS
        D_ECS --> D_REDIS
        D_ECS --> D_S3
    end

    subgraph "AWS — Prod Environment"
        P_CF["CloudFront CDN"]
        P_ALB["ALB<br/>(api.cricit.com)"]
        P_ECS["ECS Fargate<br/>(2+ tasks, auto-scale)"]
        P_RDS["RDS Postgres<br/>(db.t4g.small, Multi-AZ)"]
        P_REDIS["ElastiCache Redis<br/>(cache.t4g.small)"]
        P_S3["S3 Bucket<br/>(cricit-media-prod)"]
        P_CF --> P_ALB
        P_ALB --> P_ECS
        P_ECS --> P_RDS
        P_ECS --> P_REDIS
        P_ECS --> P_S3
    end

    L1 -.->|"git push → CI/CD"| D_ALB
    D_ECS -.->|"promote (manual approval)"| P_ECS
```

#### 3.5.2 Environment Comparison

| Aspect | Local | Dev (AWS) | Prod (AWS) |
|---|---|---|---|
| **URL** | `localhost:3000/3001` | `dev.cricit.com` / `dev-api.cricit.com` | `cricit.com` / `api.cricit.com` |
| **Compute** | Docker / native Node | ECS Fargate (1 task, 0.25 vCPU, 0.5 GB) | ECS Fargate (2+ tasks, 0.5 vCPU, 1 GB, auto-scale) |
| **Database** | Docker Postgres | RDS db.t4g.micro (single AZ) | RDS db.t4g.small (Multi-AZ, daily backups) |
| **Redis** | Docker Redis | ElastiCache cache.t4g.micro | ElastiCache cache.t4g.small |
| **Storage** | MinIO (local S3) | S3 `cricit-media-dev` | S3 `cricit-media-prod` + CloudFront CDN |
| **Auth** | Local JWT (no Cognito) | Cognito User Pool (dev) | Cognito User Pool (prod) |
| **Monitoring** | Console logs | CloudWatch (basic) | CloudWatch + Sentry + alarms |
| **SSL** | None (HTTP) | ACM cert (dev subdomain) | ACM cert (prod domain) |
| **Deploy trigger** | Manual | Auto on `develop` branch push | Manual promotion from dev |
| **Data** | Seed data | Synthetic test data | Real user data |
| **Est. cost** | $0 | **~$30–50/month** | **~$80–150/month** (at MVP scale) |

#### 3.5.3 Infrastructure as Code (IaC)

Use **AWS CDK (TypeScript)** to define both environments — same language as the app:

```
infra/
├── bin/
│   └── cricit-infra.ts          # CDK app entry point
├── lib/
│   ├── stacks/
│   │   ├── network-stack.ts     # VPC, subnets, security groups
│   │   ├── database-stack.ts    # RDS + ElastiCache
│   │   ├── storage-stack.ts     # S3 buckets + CloudFront
│   │   ├── compute-stack.ts     # ECS cluster + Fargate services + ALB
│   │   └── auth-stack.ts        # Cognito user pools
│   └── config/
│       ├── dev.ts               # Dev environment config
│       └── prod.ts              # Prod environment config
├── cdk.json
└── package.json
```

Environment configs are plain TypeScript objects:

```typescript
// infra/lib/config/dev.ts
export const devConfig = {
  envName: 'dev',
  domain: 'dev.cricit.com',
  rds: { instanceClass: 't4g.micro', multiAz: false, backupRetention: 1 },
  redis: { nodeType: 'cache.t4g.micro', numNodes: 1 },
  ecs: { cpu: 256, memory: 512, desiredCount: 1, maxCount: 1 },
};

// infra/lib/config/prod.ts
export const prodConfig = {
  envName: 'prod',
  domain: 'cricit.com',
  rds: { instanceClass: 't4g.small', multiAz: true, backupRetention: 7 },
  redis: { nodeType: 'cache.t4g.small', numNodes: 1 },
  ecs: { cpu: 512, memory: 1024, desiredCount: 2, maxCount: 6 },
};
```

#### 3.5.4 CI/CD Pipeline — GitHub Actions

```mermaid
flowchart LR
    A["git push"] --> B{"Branch?"}
    B -->|develop| C["CI: Lint + Test + Build"]
    C --> D["Build Docker Image"]
    D --> E["Push to ECR"]
    E --> F["Deploy to DEV"]
    F --> G["Run Smoke Tests"]
    
    B -->|main| H["CI: Lint + Test + Build"]
    H --> I["Build Docker Image"]
    I --> J["Push to ECR"]
    J --> K["🔒 Manual Approval"]
    K --> L["Deploy to PROD"]
    L --> M["Run Health Checks"]
    
    B -->|feature/*| N["CI: Lint + Test Only"]
```

| Trigger | Pipeline | Target |
|---|---|---|
| Push to `feature/*` | Lint → Unit tests → Type check | No deployment |
| Push/merge to `develop` | Lint → Test → Build → Docker → ECR → Deploy | **Dev environment** |
| Push/merge to `main` | Lint → Test → Build → Docker → ECR → **Manual approval** → Deploy | **Prod environment** |

> [!WARNING]
> **Prod deployments always require manual approval** via GitHub Actions environment protection rules. No accidental pushes to production.

#### 3.5.5 Phased Scaling Plan (Prod)

| Phase | Users | Compute | Database | Estimated Prod Cost |
|---|---|---|---|---|
| **Phase 1 — MVP** | 10–200 | ECS Fargate (2 tasks, 0.5 vCPU) | RDS db.t4g.small + ElastiCache cache.t4g.small | **$80–150/month** |
| **Phase 2 — Growth** | 200–2,000 | ECS Fargate (2–4 tasks, auto-scale) + ALB | RDS db.t4g.medium + ElastiCache cache.t4g.medium | **$200–400/month** |
| **Phase 3 — Scale** | 2,000–20,000 | ECS Fargate (4–10 tasks) + Redis Cluster | RDS db.t4g.large (read replicas) + ElastiCache cluster | **$600–1,200/month** |
| **Phase 4 — Large** | 20,000+ | EKS or ECS with microservices split | Aurora PostgreSQL (auto-scaling) + Redis Cluster | **$1,500+/month** |

> [!NOTE]
> **Dev environment stays small** at ~$30–50/month regardless of prod scale. It mirrors prod architecture but with minimum resource sizes.

---

## 4. System Design — Core Modules

### 4.1 Data Model (Simplified ERD)

```mermaid
erDiagram
    USER ||--o{ TEAM_MEMBER : "is member of"
    USER ||--o{ POST : "creates"
    USER {
        uuid id PK
        string name
        string email
        string phone
        string avatar_url
        string batting_style
        string bowling_style
        enum role
    }

    TEAM ||--|{ TEAM_MEMBER : "has"
    TEAM ||--o{ TOURNAMENT_TEAM : "participates"
    TEAM {
        uuid id PK
        string name
        string logo_url
        string city
        uuid created_by FK
    }

    TEAM_MEMBER {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        enum role "admin|captain|player"
    }

    TOURNAMENT ||--|{ FIXTURE : "has"
    TOURNAMENT ||--|{ TOURNAMENT_TEAM : "includes"
    TOURNAMENT {
        uuid id PK
        string name
        enum format "knockout|league|group_knockout"
        date start_date
        date end_date
        uuid organized_by FK
        enum status "upcoming|live|completed"
    }

    FIXTURE ||--|| MATCH : "is played as"
    FIXTURE {
        uuid id PK
        uuid tournament_id FK
        uuid team_a FK
        uuid team_b FK
        int round
        datetime scheduled_at
    }

    MATCH ||--|{ INNINGS : "has"
    MATCH {
        uuid id PK
        uuid fixture_id FK
        enum status "upcoming|toss|live|completed"
        uuid toss_winner FK
        string toss_decision
        uuid winner FK
        string result_summary
    }

    INNINGS ||--|{ BALL : "has"
    INNINGS {
        uuid id PK
        uuid match_id FK
        int innings_number
        uuid batting_team FK
        int total_runs
        int total_wickets
        float overs
    }

    BALL {
        uuid id PK
        uuid innings_id FK
        int over_number
        int ball_number
        uuid bowler FK
        uuid batsman FK
        int runs_scored
        boolean is_wicket
        enum extras "none|wide|no_ball|bye|leg_bye"
        string commentary
    }

    POST {
        uuid id PK
        uuid author_id FK
        string content
        string media_url
        datetime created_at
    }
```

---

### 4.2 Live Scoring — Real-Time Architecture

This is the most technically interesting module. Here's how it works:

```mermaid
sequenceDiagram
    participant Scorer as 📱 Scorer App
    participant API as API Server
    participant Redis as Redis Pub/Sub
    participant WS as WebSocket Server
    participant Viewer as 📱👁️ Viewers (N)

    Scorer->>API: POST /matches/:id/ball (ball data)
    API->>API: Validate & persist to PostgreSQL
    API->>Redis: PUBLISH match:{id} (ball event)
    Redis->>WS: Subscription notification
    WS->>Viewer: Emit "ball_update" to room match:{id}
    Note over Viewer: UI updates scorecard,<br/>strike rotation, wagon wheel
```

**Key design decisions:**

| Decision | Choice | Rationale |
|---|---|---|
| Score input | REST API (POST) | Reliable, retryable, audit trail; scorer may have spotty connectivity |
| Score broadcast | WebSocket (Socket.IO) | Low-latency fan-out to many viewers; rooms per match |
| State sync | Redis | Shared state across multiple WS server instances; fast pub/sub |
| Offline resilience | Client-side queue | Scorer queues balls locally, syncs when back online |
| Conflict resolution | Server-authoritative sequence numbers | Each ball has `(innings, over, ball)` tuple — server rejects duplicates |

---

### 4.3 API Design (Key Endpoints)

```
# Auth
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

# Teams
GET    /teams
POST   /teams
GET    /teams/:id
PUT    /teams/:id
POST   /teams/:id/invite
POST   /teams/:id/members

# Tournaments
GET    /tournaments
POST   /tournaments
GET    /tournaments/:id
GET    /tournaments/:id/fixtures
GET    /tournaments/:id/points-table
POST   /tournaments/:id/teams

# Matches & Live Scoring
GET    /matches/:id
GET    /matches/:id/scorecard
POST   /matches/:id/ball          ← scorer posts each ball
DELETE /matches/:id/ball/:ballId  ← undo last ball

# WebSocket Events (Socket.IO)
→  join_match(matchId)            ← viewer subscribes
←  ball_update(ballData)          ← real-time ball event
←  match_status(status)           ← toss, innings break, result

# Community
GET    /feed
POST   /posts
GET    /posts/:id/comments
POST   /posts/:id/comments
```

---

## 5. Recommended Dev Tools & Practices

| Area | Tool | Notes |
|---|---|---|
| **Monorepo** | Turborepo | Shared types, UI components, API client |
| **CI/CD** | GitHub Actions | Lint → Test → Build → Deploy to dev/prod |
| **IaC** | AWS CDK (TypeScript) | Infrastructure defined in same language as app |
| **Containerization** | Docker + Docker Compose | Local dev + prod-identical containers |
| **Container Registry** | AWS ECR | Stores Docker images for ECS deployments |
| **API Docs** | Swagger (auto-generated by NestJS) | Frontend team self-serves |
| **Error Tracking** | Sentry (free tier) | Crash reporting for mobile + backend |
| **Analytics** | PostHog (free self-hosted or cloud) | User behavior, feature adoption |
| **Linting** | ESLint + Prettier + Husky | Consistent code style |
| **Testing** | Jest (unit) + Playwright (E2E web) + Detox (E2E mobile) | Automated test pyramid |
| **DB Migrations** | Prisma Migrate | Auto-generates SQL migrations from schema; runs via `npx prisma migrate dev` |
| **DB Management** | Prisma Studio | Visual DB browser at `npm run db:studio` |
| **Local S3** | MinIO | S3-compatible local storage — no AWS needed for dev |

---

## 6. Improvement Suggestions

> [!IMPORTANT]
> ### Features to consider for V2+

| Feature | Description | Complexity |
|---|---|---|
| **Player Stats & Analytics** | Career batting/bowling averages, strike rates, economy — auto-computed from ball data | Medium |
| **AI Match Predictions** | Win probability updating live based on match situation (can use a simple ML model) | High |
| **Umpire DRS Tracker** | Track DRS decisions per match for fun stats | Low |
| **Fantasy League** | Pick players across tournament, earn points based on real performance | High |
| **Video Highlights** | Short clips uploaded per match, community-curated | Medium |
| **Venue Management** | Ground booking, availability calendar, map integration | Medium |
| **Monetization** | Tournament entry fees via Razorpay/Stripe, sponsored tournaments, premium features | Medium |
| **WhatsApp Integration** | Share scorecards, invite players via WhatsApp deeplinks (huge in India cricket scene) | Low |
| **Multi-language** | Hindi, Tamil, Telugu, etc. — i18n from day 1 is easier than retrofitting | Low |
| **PWA Support** | Next.js web app as installable PWA — reduces friction vs native app download | Low |

---

## 7. Architecture Decision Records (ADRs)

This section documents **why** we chose each technology over its alternatives. Each ADR is a permanent record for the team.

---

### ADR-001: Web Framework — Expo Web vs Next.js

**Status:** Open for discussion

**Context:** Expo (via Expo Router) can compile React Native apps to the web using `react-native-web`. This raises the question: why maintain a separate Next.js web app?

**Options Considered:**

| Criteria | Expo Web (Expo Router) | Next.js (App Router) |
|---|---|---|
| **Code sharing with mobile** | ✅ 95%+ shared — same components, same router | ⚠️ ~60–70% shared — shared logic/types, but separate UI components |
| **SEO (SSR/SSG)** | ⚠️ Supports static rendering, but limited — no SSR, no ISR, no Server Components | ✅ Industry-leading — SSR, SSG, ISR, Server Components, Metadata API |
| **Bundle size** | ⚠️ Carries React Native Web runtime (~30–50KB extra) | ✅ Optimized web bundles, automatic code splitting |
| **Semantic HTML** | ⚠️ `<View>` → `<div>`, `<Text>` → `<span>` — less semantic | ✅ Full control over HTML5 semantic elements |
| **Web-specific APIs** | ⚠️ Limited access to web APIs (canvas, advanced CSS) | ✅ Full browser API access |
| **Developer velocity** | ✅ One codebase, one build system | ⚠️ Separate app to maintain in monorepo |
| **Performance (Core Web Vitals)** | ⚠️ Good but not optimized for web-first metrics | ✅ Built-in image/font/script optimization |
| **Maintenance cost** | ✅ Single app to maintain | ⚠️ Two apps (web + mobile), though shared packages help |

**Decision:** **Start with Expo Web** for MVP. Add Next.js later only if SEO becomes a business-critical requirement.

**Rationale:**
- For CricIt, the primary audience accesses via **mobile app**. The web version serves as a secondary access point.
- Most pages (dashboard, scoring, team management) are **behind authentication** — SEO is irrelevant for these.
- Public pages (tournament results, scorecards) that benefit from SEO can be served as **static pre-rendered pages** via Expo Router's static rendering.
- Starting with one codebase **halves the frontend maintenance burden** — critical for a small team.
- Expo Router v4+ supports file-based routing, head management, and static exports — the gap with Next.js has narrowed significantly.

**Reversal trigger:** Add Next.js if:
- Google search traffic becomes a significant user acquisition channel
- Public scorecard/tournament pages need ISR (incremental static regeneration) for frequently changing data
- Web performance audits show Core Web Vitals issues caused by React Native Web overhead

> [!IMPORTANT]
> **Updated recommendation from original plan.** The frontend table (Section 3.1) originally listed Next.js as the web framework. Based on this analysis, we recommend **Expo Web** as the starting point, with Next.js as a scale-up option.

---

### ADR-002: Server State Management — TanStack Query vs RTK Query

**Status:** Decided — TanStack Query

**Context:** Both TanStack Query (formerly React Query) and RTK Query (part of Redux Toolkit) solve server-state caching, but they differ in philosophy and dependencies.

**Options Considered:**

| Criteria | TanStack Query | RTK Query |
|---|---|---|
| **Core dependency** | ✅ Standalone (~12KB gzipped) | ⚠️ Requires Redux Toolkit + React-Redux (~33KB total) |
| **Philosophy** | Server-state only — focused and opinionated | Part of Redux — unified client + server state |
| **Learning curve** | ✅ Low — `useQuery` / `useMutation` hooks | ⚠️ Medium — requires understanding Redux, slices, middleware |
| **Cache invalidation** | ✅ Automatic via query keys, manual via `invalidateQueries` | ✅ Tag-based invalidation (powerful, slightly more verbose) |
| **Optimistic updates** | ✅ Built-in pattern | ✅ Built-in via `onQueryStarted` |
| **Real-time / WebSocket** | ✅ Easy integration — refetch on socket events | ✅ Streaming updates via `onCacheEntryAdded` |
| **DevTools** | ✅ Excellent, standalone | ✅ Redux DevTools (powerful but heavier) |
| **Framework coupling** | ✅ Framework-agnostic (works in React Native, Vue, Svelte) | ⚠️ React-only |
| **Boilerplate** | ✅ Minimal — define query functions inline | ⚠️ More setup — `createApi`, endpoints, slices |
| **Complex client state** | ⚠️ Not designed for client state — needs Zustand/Jotai alongside | ✅ Redux handles both client and server state |

**Decision:** **TanStack Query** + **Zustand** (for minimal client state like UI preferences, scorer mode).

**Rationale:**
- CricIt is **90% server-state** — teams, matches, scores, tournaments all come from the API. TanStack Query is purpose-built for this.
- Lighter bundle footprint matters for **mobile performance** (React Native).
- No need to learn Redux concepts — lower barrier for new developers.
- For the small amount of client state (dark mode, current scorer context), **Zustand** (~1KB) is simpler than Redux.
- TanStack Query's `refetchOnWindowFocus` and `refetchInterval` integrate naturally with **live scoring** — auto-refresh scorecard every N seconds as a fallback to WebSocket.

**Reversal trigger:** Switch to RTK Query if:
- Complex client-side state grows significantly (e.g., fantasy league draft board with undo/redo)
- Team has strong existing Redux expertise and prefers a unified state layer

---

### ADR-003: Runtime — Node.js Version

**Status:** Decided — Node.js 24 LTS

**Context:** The original plan mentioned "Node.js 20+". We should pin to a specific LTS version.

**Decision:** Use **Node.js 24 LTS** (codename "Krypton", current as of August 2026).

| Version | Status | Active LTS Until | End of Life |
|---|---|---|---|
| Node.js 22 | LTS (Maintenance) | April 2027 | April 2028 |
| **Node.js 24** | **Active LTS** ✅ | **April 2027** | **April 2028** |
| Node.js 26 | Current (not LTS yet) | — | — |

**Rationale:**
- v24 is the **latest Active LTS** — gets security patches and bug fixes.
- Starting in October 2026, Node.js moves to **annual releases** where every major version becomes LTS — so v24 is a safe long-term choice.
- Pin the exact version in `.nvmrc` and `Dockerfile` to ensure parity across local/dev/prod:
  ```
  # .nvmrc
  24
  ```
  ```dockerfile
  # Dockerfile
  FROM node:24-alpine
  ```

---

### ADR-004: Backend Framework — NestJS (Node.js) vs Spring Boot (Java/Kotlin)

**Status:** Decided — NestJS

**Context:** Spring Boot is a mature, enterprise-grade framework. Why choose NestJS over it?

**Options Considered:**

| Criteria | NestJS (Node.js/TypeScript) | Spring Boot (Java/Kotlin) |
|---|---|---|
| **Language** | TypeScript — same as frontend | Java/Kotlin — separate language |
| **Startup time** | ✅ **< 2 seconds** | ⚠️ **5–30 seconds** (JVM warmup) |
| **Memory footprint** | ✅ **~80–150 MB** at rest | ⚠️ **256–512 MB** baseline (JVM heap) |
| **Docker image size** | ✅ ~150–200 MB (node:alpine) | ⚠️ ~300–500 MB (JDK base) |
| **I/O performance** | ✅ Excellent (event loop, non-blocking) | ✅ Excellent (virtual threads / Project Loom) |
| **CPU-heavy tasks** | ⚠️ Single-threaded (needs worker_threads) | ✅ Native multi-threading |
| **WebSocket support** | ✅ Built-in Gateway + Socket.IO adapter | ✅ STOMP over WebSocket |
| **ORM** | Prisma (type-safe, great DX) | JPA/Hibernate (mature, powerful) |
| **Type sharing** | ✅ Share interfaces between frontend + backend in monorepo | ❌ Requires OpenAPI codegen or separate contract |
| **Ecosystem for real-time** | ✅ Native (Node.js is built for this) | ⚠️ Possible but requires more configuration |
| **Team ramp-up** | ✅ Same skills as frontend devs | ⚠️ Requires Java/Kotlin expertise |
| **ECS Fargate cost impact** | ✅ Runs on 0.25 vCPU / 512MB tasks | ⚠️ Needs minimum 0.5 vCPU / 1GB tasks |
| **Enterprise maturity** | Good (growing) | ✅ Industry standard for 15+ years |

**Decision:** **NestJS (TypeScript)**

**Rationale:**
- **Language unification** is the #1 reason — one language (TypeScript) across frontend, backend, and infrastructure (CDK). For a small team, this eliminates context-switching and allows any developer to work on any layer.
- **Resource efficiency** — NestJS runs on **half the memory** of Spring Boot. At MVP scale on ECS Fargate, this directly translates to **~50% lower compute cost** ($40/month vs $80/month for equivalent capacity).
- **Startup speed** — < 2 sec cold start enables faster CI/CD and cheaper scaling (tasks spin up quickly during traffic spikes).
- **Real-time is a first-class citizen** — Node.js was designed for event-driven, I/O-heavy workloads. Live scoring (our most complex feature) fits perfectly.
- CricIt does **not** have CPU-heavy business logic — it's CRUD + real-time broadcasting. Spring Boot's multi-threading advantage doesn't apply here.

**Reversal trigger:** Consider Spring Boot if:
- Heavy server-side computation is added (e.g., real-time ML predictions, complex statistical analysis)
- The team grows and includes Java-experienced backend engineers
- You need advanced enterprise features (complex distributed transactions, saga patterns)

> [!NOTE]
> **Spring Boot with GraalVM Native Image** can solve the startup/memory issues, but adds significant build complexity and limits reflection-based libraries. Not recommended at MVP stage.

---

### ADR-005: Authentication — Supabase Auth vs AWS Cognito

**Status:** Decided — Start with Supabase Auth, migrate to Cognito only if needed

**Context:** Both are viable. The question is cost, developer experience, and migration difficulty.

#### Cost Comparison

| Scale (MAU) | Supabase Auth (Pro) | AWS Cognito (Essentials) | Winner |
|---|---|---|---|
| **0–200** (MVP) | $25/month (bundled with DB+storage) | $0 (free tier: 10K MAU) | Cognito (free) |
| **1,000** | $25/month (included in 100K free MAU) | ~$15/month | Supabase (bundled value) |
| **10,000** | $25/month (still under 100K free) | ~$150/month | ✅ **Supabase (6x cheaper)** |
| **100,000** | $25/month (at the limit) | ~$1,350/month | ✅ **Supabase (54x cheaper)** |
| **200,000** | $25 + (100K × $0.00325) = ~$350/month | ~$2,850/month | ✅ **Supabase (8x cheaper)** |

#### Developer Experience Comparison

| Aspect | Supabase Auth | AWS Cognito |
|---|---|---|
| **Setup time** | ✅ 15 minutes | ⚠️ 1–2 hours (user pools, app clients, IAM) |
| **Pre-built UI** | ✅ `@supabase/auth-ui-react` | ⚠️ Hosted UI exists but very limited customization |
| **Social logins** | ✅ Simple OAuth config in dashboard | ⚠️ Requires identity provider federation setup |
| **JWT handling** | ✅ Auto-managed, accessible via SDK | ✅ Standard JWT, integrates with API Gateway |
| **Row-Level Security** | ✅ Native (Postgres RLS policies) | ❌ Not applicable |
| **Documentation** | ✅ Clear, examples-rich | ⚠️ Complex, enterprise-focused |
| **Lock-in** | Low — standard Postgres + JWT | Medium — Cognito-specific APIs and triggers |

#### Migration Difficulty: Supabase → Cognito

> [!WARNING]
> Migration is **high difficulty**. Plan for it but avoid it unless necessary.

| Aspect | Difficulty | Notes |
|---|---|---|
| **User profiles** | 🟢 Easy | Export from Supabase Postgres, import via Cognito CSV import |
| **Passwords** | 🔴 Hard | Cannot export hashed passwords. Options: (a) force password reset, or (b) use Cognito "Migrate User" Lambda trigger for just-in-time migration |
| **Active sessions** | 🔴 Hard | Sessions cannot be migrated — users must re-login |
| **OAuth tokens** | 🟡 Medium | Re-configure social providers in Cognito; users re-link accounts |
| **Application code** | 🟡 Medium | Replace Supabase SDK calls with AWS Amplify/Cognito SDK |
| **Estimated effort** | — | **2–4 weeks** for a team of 2, including testing |

**Decision:** **Start with Supabase Auth**

**Rationale:**
- At MVP scale (10–200 users), Supabase's **bundled value** (Auth + Postgres + Storage + Realtime for $25/month) is unbeatable.
- **5x faster to set up** than Cognito — matters when you need to ship fast.
- The app auth flow is standard (email/password + Google OAuth) — not enterprise SSO. Supabase handles this trivially.
- Supabase Auth uses standard **JWT + Postgres** under the hood. Our NestJS backend validates JWTs via a generic guard — switching the JWT issuer later doesn't require rewriting business logic.
- **Mitigation for future migration:** Abstract auth behind a service layer (`AuthService`) so Supabase-specific code is isolated to one module.

**Reversal trigger:** Migrate to Cognito if:
- You need SAML/OIDC enterprise federation
- You need advanced security (adaptive authentication, compromised credential detection)
- You're consolidating everything on AWS and want a single vendor

---

### ADR-006: API Traffic Management — ALB vs AWS API Gateway

**Status:** Decided — ALB at MVP, API Gateway as optional addition at scale

**Context:** AWS API Gateway provides managed API features (throttling, API keys, caching). Why aren't we using it?

**Options Considered:**

| Criteria | ALB (Application Load Balancer) | AWS API Gateway (HTTP/WebSocket) |
|---|---|---|
| **Pricing model** | Fixed hourly + LCU (usage-based) | Pay-per-request + connection-minutes |
| **WebSocket cost** | ✅ No per-message or per-connection fee | ⚠️ $1.00/M messages + $0.25/M connection-minutes |
| **Idle cost** | ⚠️ ~$16/month even at zero traffic | ✅ $0 at zero traffic |
| **Live scoring cost** (est. 100 concurrent viewers, 300 balls/match, 5 matches/day) | ✅ Included in base ALB cost | ⚠️ ~$5–15/month for WebSocket messages alone |
| **Rate limiting** | ❌ Not built-in (implement in NestJS with `@nestjs/throttler`) | ✅ Built-in throttling per route/per client |
| **API keys / usage plans** | ❌ Not supported (implement in app) | ✅ Native support |
| **Auth integration** | ⚠️ No native auth (handled by NestJS guards) | ✅ Cognito authorizer, Lambda authorizer |
| **Caching** | ❌ Not supported | ✅ Built-in response caching |
| **WAF integration** | ✅ Native | ✅ Native |
| **ECS integration** | ✅ Native (target groups, health checks) | ⚠️ Requires VPC Link for private ECS tasks |
| **Complexity** | ✅ Simple — one hop to ECS | ⚠️ Additional layer — API GW → VPC Link → NLB/ALB → ECS |

**Decision:** **ALB only at MVP**

**Rationale:**
- For live scoring with **long-lived WebSocket connections**, API Gateway's per-connection-minute billing can be expensive. ALB charges a flat rate regardless of connection duration.
- NestJS already provides **rate limiting** (`@nestjs/throttler`), **auth guards**, and **request validation** at the application layer — duplicating these in API Gateway adds cost without benefit at MVP scale.
- ALB integrates **natively with ECS Fargate** — no VPC Link or NLB intermediary needed.
- API Gateway adds an **extra network hop** (latency) and another AWS service to configure/monitor.

**When to add API Gateway:**

| Trigger | Action |
|---|---|
| Need external API for third parties | Add API Gateway in front of public API routes only |
| Need per-client API keys / usage plans | Add API Gateway for external-facing endpoints |
| Need response caching at edge | Add API Gateway with caching enabled |
| DDoS protection beyond WAF | API Gateway provides additional throttling |

> [!TIP]
> **Hybrid approach at scale:** Put API Gateway in front of **public REST endpoints only** (tournament pages, scorecard APIs) for caching and throttling. Keep WebSocket traffic on **ALB directly** to avoid per-message costs.

---

### ADR-007: Database — PostgreSQL vs MongoDB

**Status:** Decided — PostgreSQL

**Context:** Cricket data is **deeply relational** — players belong to teams, teams enter tournaments, tournaments have fixtures, fixtures have matches, matches have innings, innings have balls.

**Decision:** **PostgreSQL**

**Rationale:**
- The data model has **6+ levels of relationships** (User → Team → Tournament → Fixture → Match → Innings → Ball). Postgres handles this with foreign keys and JOINs natively.
- MongoDB would require **denormalization and manual joins** — leading to data inconsistency and complex update logic.
- Postgres supports **JSONB** for semi-structured data (e.g., detailed ball metadata, match events) — giving us document-store flexibility when needed.
- **Supabase** (our auth choice) is built on Postgres — one database for both auth and application data.
- Prisma ORM provides **type-safe queries** with excellent Postgres support.

**Reversal trigger:** Consider MongoDB only if the data model becomes predominantly document-oriented (e.g., unstructured analytics events, player activity streams).

---

## 8. Open Questions

> [!IMPORTANT]
> Please clarify these before we begin implementation:

1. **Target audience geography?** India-focused (affects payment gateways, language, WhatsApp integration priority) or global?
2. **Monetization model?** Free with ads? Freemium? Tournament entry fees? This affects the data model and third-party integrations.
3. **Scoring roles?** Is scoring done by a designated scorer, or can any team member score? Do we need scorer authentication/authorization per match?
4. **Offline-first priority?** Many cricket grounds in India have poor connectivity. Should the scorer app work fully offline and sync later? This significantly impacts architecture.
5. **MVP scope?** Which of the 4 feature areas should we build first? Suggested order: Teams → Tournaments → Live Scoring → Community.
6. **Team size?** How many developers will work on this? This affects whether we go monorepo vs separate repos, and monolith vs microservices.
7. **Budget for third-party services?** Any constraints beyond AWS costs (e.g., Sentry, PostHog, Vercel)?

---

## 9. Verification Plan

### Phase 1: Local Environment
1. Set up monorepo with Turborepo
2. Create `docker-compose.yml` with Postgres + Redis + MinIO
3. Scaffold NestJS backend with Teams module + Prisma
4. Scaffold Next.js web app
5. Scaffold Expo mobile app with navigation
6. Verify `npm run dev` starts everything locally with hot reload
7. Verify Prisma migrations + seed data work
8. Implement Teams CRUD end-to-end (API → Web → Mobile)

### Phase 2: AWS Dev Environment
9. Set up AWS CDK project with dev config
10. Deploy VPC + RDS + ElastiCache + ECS to dev
11. Set up GitHub Actions CI/CD for `develop` branch → dev deploy
12. Verify API is accessible at `dev-api.cricit.com`
13. Verify WebSocket live scoring works through ALB

### Phase 3: AWS Prod Environment
14. Deploy prod environment with CDK (prod config)
15. Set up GitHub Actions manual approval gate for `main` → prod
16. Verify end-to-end flow: local → push → dev → approve → prod
17. Run smoke tests against prod
