# AGENTS.md

## Build and test commands
- To install/tidy dependencies: `go mod tidy` (run inside `Backend` directory)
- To build and compile code validation: `go build ./...` (run inside `Backend` directory)
- To run all automated unit and integration tests: `go test ./...` (run inside `Backend` directory)
- To format the codebase: `go fmt ./...` (run inside `Backend` directory)
- To run the backend API server locally: `go run cmd/api/main.go` (run inside `Backend` directory)
- To generate/update the OpenAPI swagger docs: `swag init -g cmd/api/main.go` (run inside `Backend` directory)

## Project overview
The Shared List-Builder is a robust, concurrent backend prototype designed for creating and sharing shopping lists intended for preparing and placing orders. It enables families, roommates, and event organizers to collaboratively build shopping lists, select/toggle items for the final order, and coordinate bulk acquisitions from specific vendors.

Entrypoints for a contributor to open first:
- `Backend/cmd/api/main.go` - The entry point for the REST API where the database adapter, service, and HTTP servers are initialized.
- `Backend/internal/domain/models.go` - The core domain data structures representing List, Item, and User models.
- `Backend/internal/ports/repository.go` - Outbound port interface defining standard List/Item lifecycle operations.
- `Backend/internal/services/list_service.go` - Main business logic layer implementing validations and UUID generations.
- `Backend/internal/adapters/left/http/server.go` - Inbound HTTP Chi router and REST handlers.
- `Backend/internal/adapters/right/memdb/memdb.go` - Outbound thread-safe DB adapter with in-memory concurrency protection.

### Repository layout
```
/
├── Backend/                     # Backend Go hexagonal prototype code and models
│   ├── cmd/api/main.go          # Application main entrypoint
│   ├── docs/                    # Generated swagger JSON/YAML documentation
│   └── internal/                # Hexagonal architecture packages
│       ├── adapters/            # Inbound/Outbound technical adapters (http, memdb)
│       ├── domain/              # Pure domain structures and schemas
│       ├── ports/               # Outbound repository interface definitions
│       └── services/            # Pure core business logic implementation
├── conductor/                   # Conductor agent metadata, workflow, and tracks
│   ├── code_styleguides/        # Language style guides (go, javascript, typescript)
│   └── tracks/                  # Specific track spec and plan documents
└── FrontEnd/                    # Frontend project specifications and asset files
    └── specs/                   # Project specifications (PDF)
```

## Key technologies
- **Language:** Go (1.26+) - Core language for backend development. Example: `Backend/cmd/api/main.go`.
- **Runtime:** Go Runtime - Runs compiled Go binaries. Example: `Backend/cmd/api/main.go`.
- **Package manager:** Go Modules - Handles project dependencies. Manifest: `Backend/go.mod`.
- **Framework:** Go Chi (v5) - Lightweight, standard-library compliant router. Example: `Backend/internal/adapters/left/http/server.go`.
- **Testing:** Go Testing Package - Built-in package for unit/integration tests. Example: `Backend/internal/services/list_service_test.go`.
- **Lint/Format:** gofmt - Formats Go files to Effective Go style. Config: `conductor/code_styleguides/go.md`.
- **Other notable libraries/tools:**
  - `github.com/google/uuid` - Generating secure unique list and item IDs. Example: `Backend/internal/services/list_service.go`.
  - `github.com/swaggo/http-swagger` - Serves Swagger UI on the running backend. Example: `Backend/internal/adapters/left/http/server.go`.

## Code style guidelines
- Formatting, naming, and language rules are defined in `conductor/code_styleguides/go.md`, `conductor/code_styleguides/javascript.md`, and `conductor/code_styleguides/typescript.md`.
- Naming & Schema Examples: See `Backend/internal/domain/models.go` for camelCase JSON keys, structural naming conventions, and Swaggo schema comments.
- Standard Error Response Example: See `Backend/internal/adapters/left/http/server.go` for the `respondWithError` helper function and `errorEnvelope` struct that implements the standard product error reporting.

## Testing instructions
- No specific subset or single-test method is documented. Instruct to run the full test command `go test ./...` in the `Backend` directory.
- Prerequisites: All tests run using the thread-safe, in-memory DB adapter, so no external database or local service setup is required.

## Security considerations
- The backend is a local prototype running with in-memory persistence and without authentication.
- CORS headers are configured to accept requests specifically from the local frontend development origin (`http://localhost:3000`).

## Extra instructions
- **Pull Request Template:** No Pull Request template exists in the repository (TODO: document it).
- **Changelog:** No CHANGELOG.md file exists in the repository (TODO: document it).

### Agent development cycle (default, unless overridden)
- This is the default workflow for this repository.
- Override: Only override this workflow if the task explicitly says to use a different workflow (e.g., "override the default workflow" / "follow this workflow instead") or provides its own step-by-step "Workflow / Way of working". If overridden, do not merge workflows.
- Plan once: Before coding, propose a TODO list oriented to iterative implementation and STOP. Ask for approval once. After approval, proceed without asking for the plan again unless new information invalidates it.
- Test-first (when supported): If the repo has an existing test framework AND documented test command(s) (as listed in this AGENTS.md), write/update tests that specify the new behavior before implementing the production change.
- Quality gate (must answer “yes” before finishing):
  - Task alignment: Does the change meet every requirement from the original request (and nothing unrelated)?
  - Tests for new logic: Did I add/adjust unit tests covering the success path and relevant error or edge cases (when supported in this repo)?
  - Idiomatic + consistent: Does the implementation follow repo conventions and language idioms?
  - Clarity + simplicity: Is the code easy to read and minimizes complexity?
  - Error handling: Are failure modes handled explicitly using the repo’s idioms (exceptions, Result types, validations, retries), with no silent failures?
- Final verification (only using verified commands listed above): Run the applicable validation commands that exist in this repo and are listed in "Build and test commands":
  - build/compile validation (if listed)
  - tests covering what you changed (single/scope if documented, otherwise full test command)
  - lint/format/typecheck (if listed)
  - **Live Browser Verification (Mandatory on Frontend Changes):** Every time any modification is made to the FrontEnd codebase, the agent must verify the live status of the website by executing an HTTP query (e.g. `curl -v http://localhost:3000` or using browser console checkers) to confirm that the dev server is active and the site renders cleanly with an HTTP `200 OK` status and no hydration/module-not-found errors. A task is incomplete until live rendering is fully verified.

Verify for every instruction if the project build and run in the web browser