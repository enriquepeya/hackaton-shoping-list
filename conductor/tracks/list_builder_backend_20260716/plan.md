# Plan: Implement List-Builder Core Backend and Hexagonal API

This plan breaks down the development of the "List-Builder" backend service into testable, incremental phases, using Test-Driven Development (TDD) as defined in `conductor/workflow.md`.

---

## Phase 1: Domain and Repository Ports Setup

- [x] Task: Create Domain Model Structures (f4ee202)
    - [x] Write domain structure unit tests or verification in `internal/domain`
    - [x] Implement `domain.Item`, `domain.List`, and `domain.User` structs (no JSON tags or routing dependencies)
- [x] Task: Define Port Interfaces (56c1845)
    - [x] Define `ListRepository` outbound port in `internal/ports` with all list/item lifecycle operations
- [x] Task: Conductor - User Manual Verification 'Phase 1: Domain and Repository Ports Setup' (Protocol in workflow.md)

## Phase 2: Concurrency-Safe Memory DB Adapter

- [x] Task: Implement Outbound Memory Adapter (a290598)
    - [x] Write failing repository unit tests in `internal/adapters/right/memdb/memdb_test.go`
    - [x] Implement `MemDB` adapter using `map[string]*domain.List` protected by `sync.RWMutex`
    - [x] Verify that all repository unit tests pass (Green Phase)
    - [x] Verify database concurrency safety with automated concurrent test runs
- [x] Task: Conductor - User Manual Verification 'Phase 2: Concurrency-Safe Memory DB Adapter' (Protocol in workflow.md)

## Phase 3: Core Business Logic Service Layer

- [x] Task: Implement Domain Services (b5b28c3)
    - [x] Write failing unit tests in `internal/services/list_service_test.go` verifying title/owner validation and UUID generation
    - [x] Implement `ListService` core business logic
    - [x] Verify all service-layer tests pass (Green Phase)
- [x] Task: Conductor - User Manual Verification 'Phase 3: Core Business Logic Service Layer' (Protocol in workflow.md)

## Phase 4: Inbound REST Controllers with Go Chi

- [x] Task: Initialize Server Command and Router Scaffolding (f7e7a16)
    - [x] Write failing router configuration tests checking middleware, CORS, and routing setup
    - [x] Scaffolding `cmd/api/main.go` and Go Chi Router in `internal/adapters/left/http/server.go`
    - [x] Verify router/middleware tests pass (Green Phase)
- [x] Task: Implement REST Endpoints (158db5b)
    - [x] Write failing integration/controller tests for all five list endpoints (checking camelCase, HTTP status, and error envelopes)
    - [x] Implement HTTP controllers mapping JSON requests/responses using camelCase fields
    - [x] Implement error helper mapping standard domains to `{ "error": { "code": "...", "message": "..." } }`
    - [x] Verify all controller/integration tests pass (Green Phase)
- [x] Task: Conductor - User Manual Verification 'Phase 4: Inbound REST Controllers with Go Chi' (Protocol in workflow.md)
