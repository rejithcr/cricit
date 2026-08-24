# CricIt — AI Agent Instructions Guide

This document provides architectural context and strict coding guidelines for any AI agent or developer working on the CricIt codebase.

## 1. Project Overview & Tech Stack

CricIt is a cricket community and live-scoring application. It operates as a monorepo managed by **Turborepo** to share types, configs, and UI components across the stack.

### Core Technologies
*   **Language:** TypeScript (Strict Mode) across the entire stack.
*   **Runtime:** Node.js 24 LTS.
*   **Frontend (Mobile & Web):** Expo (React Native) with Expo Router (Web output). Next.js is reserved for future SEO scaling.
*   **State Management:** TanStack Query (React Query) for server-state caching, Zustand for minimal client-side state.
*   **Backend API:** NestJS (modular architecture).
*   **Database & ORM:** PostgreSQL accessed via Prisma ORM (with Prisma Migrate for schema migrations).
*   **Real-time:** Socket.IO (NestJS Gateway) with Redis adapter for live scoring broadcasts.
*   **Authentication:** Supabase Auth (or AWS Cognito). Backend relies on standard JWT validation.
*   **Infrastructure:** AWS ECS Fargate, ALB, RDS, ElastiCache, deployed via AWS CDK (TypeScript).

---

## 2. Strict Coding Guidelines

When writing, refactoring, or reviewing code in this repository, you **MUST** adhere to the following rules:

### Rule 1: Modularity and Extensibility
*   Code must be highly modular and loosely coupled.
*   Use interfaces and dependency injection (especially within NestJS) to ensure components can be extended or replaced without cascading refactors.

### Rule 2: Single Responsibility (One File = One Functionality)
*   Every file must serve exactly one distinct purpose.
*   Do not bundle multiple React components, NestJS services, or controllers into a single file. Break them out into their own files.

### Rule 3: Strict Cyclomatic Complexity Limits
*   The cyclomatic complexity of any single function must remain low (maximum **10 to 15**).
*   If a function requires excessive branching (`if/else`, `switch`), it must be refactored into smaller, private helper functions or handled via polymorphism.
*   File length should naturally remain short to respect this complexity limit.

### Rule 4: Reusability
*   Always extract duplicate logic into reusable utilities or hooks.
*   For the frontend, build and utilize a consistent, reusable UI component library in a shared Turborepo package. Do not write ad-hoc UI components or inline styles.

### Rule 5: Code Readability as the Highest Priority
*   Code readability supersedes "clever" one-liners or premature micro-optimizations.
*   Use descriptive, unabbreviated variable and function names.
*   Provide clear JSDoc comments for complex business logic, particularly around live scoring state resolution and socket event handling.
*   Rely on ESLint and Prettier for consistent formatting.

### Rule 6. Create adaptors for services.
* for any service eg. authentication, payment , cache, database etc. should be easily replaceable with other providers. Create wrapper/adpaters to achieve this.

### Rule 7. UI design language
* Folow the  ios whatsapp deisgn language
---

## 3. Local Runnability

*   The entire application stack (all apps and infrastructure dependencies) **must** be able to run locally.
*   Ensure that any new infrastructure (databases, caches, storage) introduced to the stack has a local equivalent (e.g., via Docker Compose) so that development is never blocked by AWS dependencies.
