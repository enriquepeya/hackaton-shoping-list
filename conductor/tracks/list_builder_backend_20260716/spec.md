# Specification: Implement List-Builder Core Backend and Hexagonal API

## 1. System Overview
This specification covers the initial development of the Go-based "List-Builder" backend, adhering to Hexagonal Architecture patterns. This service provides memory-based persistence, thread-safe concurrent map storage, and a robust Go Chi REST API that exposes shopping list lifecycle management, order preparation item management, and sharability options.

## 2. Domain Models (`internal/domain`)
No external tags (except JSON annotations).
*   `Item`:
    *   `SKU` (string)
    *   `EAN` (string, nullable)
    *   `ListID` (string)
    *   `Description` (string)
    *   `Quantity` (int)
*   `List`:
    *   `ID` (string)
    *   `Title` (string)
    *   `Items` ([]Item)
    *   `VendorAssociated` (string, nullable)
    *   `OwnerId` (string)
    *   `ListType` (ENUM string: "PRIVATE", "PUBLIC")
    *   `IsSharable` (bool)
    *   `Image` (string)
    *   `CreatedAt` (time.Time)
    *   `UpdatedAt` (time.Time)
    *   `DeletedAt` (time.Time, nullable)
    *   `LastPurchaseDate` (time.Time)
    *   `AddedByUserID` (string)
*   `User`:
    *   `UserID` (string)
    *   `Role` (string)
    *   `JoinedAt` (time.Time)

## 3. Ports (`internal/ports`)
Interfaces connecting Domain Core with Adapters:
*   `ListRepository` (Outbound Port):
    *   `CreateList(list *domain.List) error`
    *   `GetListByID(id string) (*domain.List, error)`
    *   `GetAllLists() ([]*domain.List, error)`
    *   `AddItemToList(listID string, item *domain.Item) error`
    *   `ToggleItem(listID string, itemID string) error`
    *   `DeleteItem(listID string, itemID string) error`
    *   `DeleteList(id string) error`

## 4. Adapters
*   **Outbound Adapter (`internal/adapters/right/memdb`):**
    *   Implements `ListRepository`.
    *   Uses `map[string]*domain.List` internal map.
    *   Secured using `sync.RWMutex`.
*   **Inbound Adapter (`internal/adapters/left/http`):**
    *   Implements JSON API REST endpoints using `github.com/go-chi/chi/v5`:
        *   `GET /api/v1/lists/{user_id}` (retrieves lists owned by or accessible to user)
        *   `GET /api/v1/lists/{id}/{user_id}` (retrieves a single list if authorized)
        *   `POST /api/v1/lists` (creates list)
        *   `POST /api/v1/lists/{id}/items` (appends item to list)
        *   `PATCH /api/v1/lists/{id}/items/{itemId}/toggle` (toggles selected/included state for the item in the order)

## 5. Architecture & Constraints
*   **TDD Methodology:** All tasks must start with writing failing unit tests followed by implementation.
*   **Casing:** JSON payloads must strictly use `camelCase`.
*   **Errors:** Errors wrapped in `{ "error": { "code": "...", "message": "..." } }`.
