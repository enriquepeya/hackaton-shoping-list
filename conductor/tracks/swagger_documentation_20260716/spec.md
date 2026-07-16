# Specification: Interactive Swagger API Documentation via Go Annotations

## 1. Overview
The goal of this track is to add declarative Swagger 2.0 API documentation to the "List-Builder" backend service using standard Go annotations/comments. The documentation will compile into static swagger assets using the `swaggo/swag` CLI tool, and will be rendered interactively directly on the running Go backend using `http-swagger` Chi middleware. This will enable developers to test all REST endpoints locally in a structured UI.

## 2. Functional Requirements
*   **Go Annotations Coverage:**
    *   **Endpoints:** Add swaggo comments to all REST controller handlers:
        *   `GET /api/v1/lists/{userId}`
        *   `GET /api/v1/lists/{id}/{userId}`
        *   `POST /api/v1/lists`
        *   `POST /api/v1/lists/{id}/items`
        *   `PATCH /api/v1/lists/{id}/items/{itemId}/toggle`
        *   `DELETE /api/v1/lists/{id}`
        *   `DELETE /api/v1/lists/{id}/items/{itemId}`
    *   **Data Models (Schemas):** Annotate all domain structures (`domain.List`, `domain.Item`, `domain.User`, `createListRequest`, `addItemRequest`, `errorEnvelope`, `errorDetails`) so they are rendered as structured models with standard Go/JSON data types and examples in the Swagger UI.
    *   **Response Codes & Envelopes:** Explicitly document standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`) mapping their respective payloads and the error envelope structures.
*   **Swagger Router Integration:**
    *   Configure `go-chi` router in `Backend/internal/adapters/left/http/server.go` to serve the interactive Swagger UI at `/swagger/*`.
    *   Use the standard `github.com/swaggo/http-swagger` middleware to load generated `docs.go` files and render Swagger UI.
*   **Compilation and Local Generation:**
    *   Define a swaggo documentation generation pipeline that updates static OpenAPI assets inside `Backend/docs/` when running the generation command.

## 3. Non-Functional Requirements & Design Guidelines
*   **Zero Impact on Hexagonal Core:** Documentation annotations must live inside controller layers (`server.go` / HTTP handlers) or model structs. Business services and repository interfaces must remain pure and free from swaggo dependencies.
*   **Strict JSON Matching:** The Swagger schema properties must perfectly align with our `camelCase` JSON key casing guidelines and existing model fields.

## 4. Acceptance Criteria
*   Navigating to `http://localhost:8080/swagger/index.html` on a running server renders the fully interactive Swagger UI.
*   All 7 endpoints are clearly documented, displaying expected parameters, request schemas, status codes, and response bodies.
*   All Go structural models (List, Item, etc.) are rendered accurately under the Schemas block with clear field types and `camelCase` identifiers.
*   Errors are fully documented showing the standard `{ "error": { "code": "...", "message": "..." } }` envelope.
*   The project compiles successfully with `go build` after generation.

## 5. Out of Scope
*   Authentication mechanisms in the Swagger UI (since the prototype backend has no user authentication layers).
