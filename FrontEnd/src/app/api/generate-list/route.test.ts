/**
 * @jest-environment node
 */

import { POST } from "./route";

describe("AI BFF API Route /api/generate-list", () => {
  it("returns mock asado list when prompt contains 'asado'", async () => {
    const mockRequest = new Request("http://localhost:3000/api/generate-list", {
      method: "POST",
      body: JSON.stringify({ prompt: "Quiero hacer un asado con mis amigos" }),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.list_title).toBe("Asado Día del amigo");
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("returns mock desayuno list when prompt contains 'desayuno'", async () => {
    const mockRequest = new Request("http://localhost:3000/api/generate-list", {
      method: "POST",
      body: JSON.stringify({ prompt: "un desayuno proteico para arrancar" }),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.list_title).toBe("Desayuno Proteico Semanal");
  });

  it("returns default mock list when prompt does not match special cases", async () => {
    const mockRequest = new Request("http://localhost:3000/api/generate-list", {
      method: "POST",
      body: JSON.stringify({ prompt: "algo rápido para cenar" }),
      headers: { "Content-Type": "application/json" }
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.list_title).toBe("Cena Saludable Express");
  });
});
