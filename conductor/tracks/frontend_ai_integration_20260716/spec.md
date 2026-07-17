# Specification: Next.js Frontend and AI BFF Integration

This specification outlines the integration of a Next.js (React) mobile-first frontend with an intelligent LLM-driven BFF (Backend-For-Frontend) endpoint, persisting collaborative shopping lists onto our Go Hexagonal API backend.

## 1. Architectural Model
To maximize hackathon velocity, we employ a BFF pattern:
- **Client (React / Next.js):** Render the beautiful, responsive mobile layout, manage local state (Zustand/Context), and drive interactions.
- **BFF (Next.js API Route `/api/generate-list`):** Directly connect with the LLM. It processes natural language inputs, returns structured JSON (including item list and mock store prices/badges/ETAs), avoiding Go backend complexity for JSON formatting constraints.
- **Data Core (Go Chi Backend `/api/v1/*`):** Handles shared list persistency, item CRUD operations, and concurrent status updates.

```
┌─────────────────┐             ┌─────────────────────┐
│  Next.js App    │ ──(Prompt)─>│ Next.js Route BFF   │──(system prompt)─> [ LLM API ]
│  (React Client) │ <─(Suggest)─│ /api/generate-list  │<─(JSON list)──────
└────────┬────────┘             └─────────────────────┘
         │
    (POST /api/v1/lists)
         │
         ▼
┌──────────────────┐
│  Go Chi Backend  │ <──(in-memory thread-safe storage)
└──────────────────┘
```

## 2. Component Deliverables
- **Buscador Cognitivo:** Large text area accepting unstructured prompt with fast-suggest chip buttons.
- **Gestor de Listas:** Displaying saved lists with product details, including health alert stamps (octógonos negros like "Exceso en azúcares").
- **Comparador de Locales:** Displaying Carrefour, Jumbo, PedidosYa Market, and Dia comparing ETA, prices, and badges.
- **Checkout Flow:** Rider tips selection, checkout instructions, priority shipping options, and total price computations.
- **Success Screen:** Confirmation banner with primary CTA to "Save list" in Go backend database and automatic tracking redirection.

## 3. Data Integration & JSON Schema
The Next.js BFF returns the following format:
```json
{
  "list_title": "Asado Día del amigo",
  "description": "Lista de asado y bebidas sugerida para 5 personas",
  "items": [
    { "name": "Vacio de novillo", "brand": "Generic", "quantity": 1, "size": "1.5kg" },
    { "name": "Papas Fritas Lays Clásicas", "brand": "Lays", "quantity": 2, "size": "150g" }
  ],
  "suggested_stores": [
    { "store_name": "PedidosYa Market", "total_price": 45000, "eta": "15 - 20 min", "badge": "Mejor precio" },
    { "store_name": "Carrefour", "total_price": 48000, "eta": "20 - 40 min", "badge": "Completa" }
  ]
}
```
When user confirms, Frontend translates this into Go Backend schema:
- `POST /api/v1/lists` -> Creates List `{title: "Asado Día del amigo", ownerId: "user-123", vendorAssociated: "PedidosYa Market", isSharable: true}`.
- `POST /api/v1/lists/{id}/items` -> Iteratively adds items (e.g. Description: `"Vacio de novillo - Generic (1.5kg)"`).
