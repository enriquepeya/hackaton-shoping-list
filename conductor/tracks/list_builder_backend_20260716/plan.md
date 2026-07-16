# Plan: Implement List-Builder Core Backend and Hexagonal API

This plan breaks down the development of the "List-Builder" backend service into testable, incremental phases, using Test-Driven Development (TDD) as defined in `conductor/workflow.md`.

---

## Phase 1: Domain and Repository Ports Setup

- [x] Task: Create Domain Model Structures (f4ee202)
    - [x] Write domain structure unit tests or verification in `internal/domain`
    - [x] Implement `domain.Item`, `domain.List`, and `domain.User` structs (no JSON tags or routing dependencies)
- [x] Task: Define Port Interfaces (56c1845)
    - [x] Define `ListRepository` outbound port in `internal/ports` with all list/item lifecycle operations
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Domain and Repository Ports Setup' (Protocol in workflow.md)

## Phase 2: Concurrency-Safe Memory DB Adapter

- [ ] Task: Implement Outbound Memory Adapter
    - [ ] Write failing repository unit tests in `internal/adapters/right/memdb/memdb_test.go`
    - [ ] Implement `MemDB` adapter using `map[string]*domain.List` protected by `sync.RWMutex`
    - [ ] Verify that all repository unit tests pass (Green Phase)
    - [ ] Verify database concurrency safety with automated concurrent test runs
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Concurrency-Safe Memory DB Adapter' (Protocol in workflow.md)

## Phase 3: Core Business Logic Service Layer

- [ ] Task: Implement Domain Services
    - [ ] Write failing unit tests in `internal/services/list_service_test.go` verifying title/owner validation and UUID generation
    - [ ] Implement `ListService` core business logic
    - [ ] Verify all service-layer tests pass (Green Phase)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Core Business Logic Service Layer' (Protocol in workflow.md)

## Phase 4: Inbound REST Controllers with Go Chi

- [ ] Task: Initialize Server Command and Router Scaffolding
    - [ ] Write failing router configuration tests checking middleware, CORS, and routing setup
    - [ ] Scaffolding `cmd/api/main.go` and Go Chi Router in `internal/adapters/left/http/server.go`
    - [ ] Verify router/middleware tests pass (Green Phase)
- [ ] Task: Implement REST Endpoints
    - [ ] Write failing integration/controller tests for all five list endpoints (checking camelCase, HTTP status, and error envelopes)
    - [ ] Implement HTTP controllers mapping JSON requests/responses using camelCase fields
    - [ ] Implement error helper mapping standard domains to `{ "error": { "code": "...", "message": "..." } }`
    - [ ] Verify all controller/integration tests pass (Green Phase)
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Inbound REST Controllers with Go Chi' (Protocol in workflow.md)
