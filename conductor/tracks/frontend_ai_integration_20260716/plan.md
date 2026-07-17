# Plan: Implement Next.js PWA Frontend and AI Shopping Assistant BFF Integration

This plan breaks down the development of the "List-Builder" frontend and Next.js AI BFF service into incremental, testable tasks.

---

## Phase 1: Next.js Boilerplate & Mobile-First Container Scaffold [checkpoint: 015e436]
- [x] Task: Set up Next.js app with Tailwind CSS and TypeScript (f63ef67)
    - [ ] Create Next.js app boilerplate under `FrontEnd/` directory
    - [ ] Configure Tailwind CSS and compile verifying standard output
- [x] Task: Build Mobile-First Main Layout Container (be6b335)
    - [ ] Scaffold the main application wrapper centered using class names `"max-w-md mx-auto min-h-screen bg-white shadow-xl relative overflow-hidden"`
    - [ ] Add basic routing, custom navigation tabs, and default empty state components

## Phase 2: AI Shopping Assistant BFF Route [checkpoint: 973036d]
- [x] Task: Implement AI BFF Endpoint (6b27fda)
    - [ ] Scaffold Next.js API Route `/api/generate-list` accepting a POST request with the user prompt
    - [ ] Inject the System Prompt from `FrontEnd/specs/AGENT.MD` into the LLM SDK client call
    - [ ] Implement fallback mock logic (returning predefined lists for "Asado", "Desayuno", etc.) for offline hackathon testing
    - [ ] Write integration test validating API endpoint parses inputs correctly and responds with valid structured JSON

## Phase 3: Visual Interface & UI Components
- [ ] Task: Build Buscador Cognitivo & Chip suggestions
    - [ ] Create input text field block and horizontal suggestion chips list (e.g. "Para toda la semana")
- [ ] Task: Build Gestor de Listas & Item Details
    - [ ] Build item lists component rendering SKU, EAN, description, quantities, and black warning octagons (e.g., "Exceso en Azúcares")
- [ ] Task: Build Comparador de Locales
    - [ ] Implement shop comparison tabs (Carrefour, Jumbo, PedidosYa Market, Dia) showing total price, ETA, and badges (e.g., "Mejor precio")
- [ ] Task: Build Checkout and Payment flow
    - [ ] Create checkout form with priority delivery check toggle, rider tips button group, and final totals module

## Phase 4: Full Integration with Go Hexagonal API Backend
- [ ] Task: Connect Frontend State to Go API Backend
    - [ ] Configure HttpClient (e.g. axios/fetch) targeting Go Backend on `http://localhost:8080` (configured with CORS)
    - [ ] On list confirmation, trigger `POST /api/v1/lists` creating the list and `POST /api/v1/lists/{id}/items` iterating to save items
    - [ ] Implement `PATCH /api/v1/lists/{id}/items/{itemId}/toggle` on checking items, with optimistic updates in UI
- [ ] Task: Conductor - User Manual Verification 'End-to-end Interactive Demo' (Protocol in workflow.md)
