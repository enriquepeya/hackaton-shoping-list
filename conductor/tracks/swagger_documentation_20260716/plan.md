# Plan: Interactive Swagger API Documentation via Go Annotations

This plan details the step-by-step implementation of declarative Swaggo-based Swagger documentation and UI rendering on the Go Chi HTTP server.

---

## Phase 1: dependencies & base router scaffolding

- [ ] Task: Initialize Swagger UI Router and Dependencies
    - [ ] Write failing router unit tests checking that a request to `/swagger/index.html` initiates a valid router action (Red Phase)
    - [ ] Install packages `github.com/swaggo/swag/cmd/swag` and `github.com/swaggo/http-swagger` in `Backend` directory
    - [ ] Import generated docs folder in `Backend/cmd/api/main.go` and mount http-swagger handler in `Backend/internal/adapters/left/http/server.go`
    - [ ] Verify that router compilation and router tests pass successfully (Green Phase)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: dependencies & base router scaffolding' (Protocol in workflow.md)

## Phase 2: Annotate Data Models and Schemas

- [ ] Task: Document Struct Schemas
    - [ ] Add Swaggo struct-level field comments to `domain.Item`, `domain.List`, `domain.User` in `Backend/internal/domain/models.go`
    - [ ] Add Swaggo comments to request payload structs (`createListRequest`, `addItemRequest`) and standard error structs (`errorEnvelope`, `errorDetails`)
    - [ ] Verify that the packages build successfully without any syntax errors
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Annotate Data Models and Schemas' (Protocol in workflow.md)

## Phase 3: Document REST Handlers and Compile OpenAPI Docs

- [ ] Task: Annotate Handlers and Build UI
    - [ ] Add API general info annotations in `Backend/cmd/api/main.go` (e.g. title, version, base path)
    - [ ] Annotate the standard health check handler and all 7 list/item CRUD and Toggle endpoints in `Backend/internal/adapters/left/http/server.go` with Swaggo param/response metadata
    - [ ] Execute `swag init -g cmd/api/main.go` inside the `Backend` directory to compile all comments into static OpenAPI docs under `Backend/docs/`
    - [ ] Confirm all unit and integration tests continue to compile and pass cleanly
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Document REST Handlers and Compile OpenAPI Docs' (Protocol in workflow.md)
