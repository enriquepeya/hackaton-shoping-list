# Technology Stack: Shared List-Builder

This document defines the official technology stack, dependencies, and environment configurations for the Shared List-Builder project.

## 1. Backend Service
*   **Language:** **Go (1.26+)**
    *   Selected for high performance, ease of concurrency, and clean hexagonal architecture implementation.
*   **Web Framework / Router:** **Go Chi (v5) (`github.com/go-chi/chi/v5`)**
    *   Acts as the primary inbound controller router. Lightweight, fully standard-library compliant, and idiomatic for Go services.
    *   *Alternatives considered:* Gin Gonic (for high-volume APIs) and Express.js (for JS-focused stacks). Go Chi was chosen to maintain standard library compatibility.
*   **Main Dependencies:**
    *   `github.com/google/uuid`: Generating secure unique list and item IDs.

## 2. Frontend Interface
*   **Framework:** **Next.js (React.js)**
    *   **Languages:** **TypeScript & JavaScript**
    *   Provides a highly interactive, server-side rendered (SSR) or statically generated client-side interface for real-time list building, sharing, and order preparation.

## 3. Persistence Layer
*   **Storage Adapter:** **Concurrency-Safe MemDB**
    *   A thread-safe, in-memory repository implementation using standard Go `map[string]*domain.List` wrapped with a read/write mutex (`sync.RWMutex`) to guarantee safe concurrent reads and writes.
    *   *Design note:* Decoupled via outbound ports to allow a seamless future adapter migration to PostgreSQL or SQLite without touching core domain models or business logic.

## 4. Development & Network Configurations
*   **Network Port:** `8080` (configurable via `PORT` environment variable).
*   **CORS Configuration:** Enabled for `http://localhost:3000` (Next.js development origin) to facilitate frontend integration testing.
