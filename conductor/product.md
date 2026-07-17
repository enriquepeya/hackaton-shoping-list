# Initial Concept

Una aplicacion para la generacion de listas de compras que se puedan compartir entre usuarios basandote en la spec presente en el Agent.Md

---

# Product Definition: Shared List-Builder

## 1. Product Vision
The Shared List-Builder is a robust, concurrent backend prototype designed for creating and sharing shopping lists intended for preparing and placing orders. It enables families, roommates, and event organizers to collaboratively build shopping lists, select/toggle items for the final order, and coordinate bulk acquisitions from specific vendors before placing a unified order.

## 2. Target Audience
*   **Families & Households:** Building combined household grocery and supplies orders.
*   **Roommates:** Collating co-living requirements into shared orders to divide costs easily.
*   **Event Organizers:** Constructing order specifications with accurate quantities for bulk event hosting.

## 3. Core Features & Functional Requirements
*   **List Lifecycle Management:** Users can create, retrieve, update, and delete shopping lists.
*   **Item Lifecycle Management:** Users can add items, toggle their inclusion or selection status in the active list (e.g., preparing/selecting for the final order), and delete items.
*   **AI-Powered Shopping Assistant:** Translates natural language requests (e.g., "Asado Día del amigo") into comprehensive shopping lists with automatically inferred products, brands, and quantities.
*   **Store Routing & Cost Comparison:** Evaluates generated shopping lists across multiple vendors (Carrefour, Jumbo, PedidosYa Market, Dia) to dynamically compare prices, ETA, and optimal routing badges.
*   **Flexible Share Settings & Ownership:**
    *   Lists have explicit owners (`OwnerId`) and visibility types (`PRIVATE` or `PUBLIC`).
    *   Lists can be explicitly marked as sharable (`IsSharable`) or non-sharable regardless of their list type.
    *   Enables collaborative user access so shared users can contribute to or view the list.
*   **Rich Item Data with Vendor Support:** Items support standard fields like `SKU`, `quantity`, `Description`, and nullable `EAN` codes. Lists can be associated with a specific vendor (`VendorAssociated`).

## 4. Key Architectural & Non-Functional Goals
*   **Hexagonal Architecture:** Strict boundary isolation between Domain model entities, Ports (inbound/outbound interfaces), and Adapters (HTTP controllers, thread-safe memory database). This ensures maximum modularity and enables future seamless migrations (e.g., swapping out memory persistence for a PostgreSQL adapter).
*   **Thread-Safety:** High-performance, concurrency-safe in-memory database operations using `sync.RWMutex` to handle overlapping concurrent user writes gracefully.
*   **Developer-Friendly REST API:** Clean JSON-over-HTTP endpoints for seamless frontend integration, configured with CORS for simple local development.
