# Product Guidelines: Shared List-Builder

These guidelines define standard design, communication, and API patterns for the Shared List-Builder project. Adhering to these principles ensures consistency across our REST API, error reporting, codebase documentation, and frontend-backend synchronization models.

## 1. Prose, Comments & Documentation Tone
*   **Tone:** Concise, direct, and technical. Avoid flowery preambles or conversational filler.
*   **Code Comments:** Focus comments strictly on "why" rather than "what". Document architectural decisions, thread-safety measures, and domain constraints.
*   **User/Client Feedback:** Provide informative messages that outline exactly what happened, avoiding ambiguous technical jargon (e.g., say "Invalid SKU identifier format" instead of "Parse error on string structure").

## 2. API Design & Key Casing
*   **JSON Naming Convention:** All API payloads (both requests and responses) must strictly use **`camelCase`** for JSON keys.
    *   *Correct:* `{"ownerId": "user_123", "vendorAssociated": "supermarket_xyz"}`
    *   *Incorrect:* `{"owner_id": "user_123", "VendorAssociated": "supermarket_xyz"}`
*   **RESTful Resource Uniformity:** Path variables must represent resources clearly. Endpoints should consistently return resources wrapped in intuitive outer JSON keys when returning multiple results.

## 3. Error Handling and Envelope Strategy
*   **Standard Envelope Structure:** All errors must use a uniform error envelope block. This ensures that frontend layers can parse error responses reliably without inspecting flat custom fields.
*   **Format:**
    ```json
    {
      "error": {
        "code": "<SYSTEM_ERROR_CODE>",
        "message": "<Concise, technical description of the error>"
      }
    }
    ```
*   **Common Error Codes:**
    *   `LIST_NOT_FOUND`: The requested list ID does not exist.
    *   `INVALID_REQUEST_PAYLOAD`: Validation errors in the incoming request body (e.g., missing mandatory list `title`).
    *   `INTERNAL_SERVER_ERROR`: Fallback for unhandled backend panics or repository failures.

## 4. Frontend-Backend Sync & UX Guidelines
For any UI/Front-end layers consuming this API, the following synchronization guidelines apply:
*   **Optimistic Updates for Toggles:** Item toggle operations should reflect immediately in the user interface. If the backend fails to sync the state (e.g. network disconnect), the UI must gracefully roll back to the previous state.
*   **Explicit Sync States for Mutative Actions:** Creation of new lists or major item additions should present explicit progress spinners/disabled states to ensure double-submits do not occur.
*   **Contextual Feedback:** Provide immediate feedback (e.g., toasts, subtle animations, or brief status banners) for critical collaborative steps, such as when user list shareability or ownership settings change.
