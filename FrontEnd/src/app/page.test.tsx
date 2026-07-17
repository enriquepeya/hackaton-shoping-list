import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./page";

describe("Home PWA Layout", () => {
  it("renders the Home screen with correct address, and cognitive launcher is hidden by default", () => {
    render(<Home />);
    
    // Check delivery address from the home screen
    expect(screen.getByText("Av. Juan J. Paso 3535")).toBeInTheDocument();
    
    // Check main title on the bottom panel is NOT initially displayed
    expect(screen.queryByText("Armá tu lista")).not.toBeInTheDocument();

    // Click the floating button (📋)
    const toggleButton = screen.getByTitle("Abrir buscador cognitivo");
    fireEvent.click(toggleButton);

    // Now it should be displayed!
    expect(screen.getByText("Armá tu lista")).toBeInTheDocument();
  });

  it("switches tabs correctly when clicking on tab buttons", () => {
    render(<Home />);
    
    // Default view is Home screen, so build page is not initially active
    expect(screen.queryByText("¿Qué necesitás hoy?")).not.toBeInTheDocument();
    
    // Click 'IA Assistant' tab
    const buildTabButton = screen.getByRole("button", { name: /IA Assistant/i });
    fireEvent.click(buildTabButton);
    
    // Should render build view
    expect(screen.getByText("¿Qué necesitás hoy?")).toBeInTheDocument();
    
    // Click 'Mis Listas' tab
    const listsTabButton = screen.getByRole("button", { name: /Mis Listas/i });
    fireEvent.click(listsTabButton);
    
    // Should render lists view
    expect(screen.getByText("Mis listas")).toBeInTheDocument();
    expect(screen.queryByText("¿Qué necesitás hoy?")).not.toBeInTheDocument();
    
    // Click 'Checkout' tab
    const checkoutTabButton = screen.getByRole("button", { name: /Checkout/i });
    fireEvent.click(checkoutTabButton);
    
    // Should render checkout empty state
    expect(screen.getByText("Tu carrito de checkout está vacío")).toBeInTheDocument();
    expect(screen.queryByText("Mis listas")).not.toBeInTheDocument();

    // Click 'Inicio' (Home) tab
    const homeTabButton = screen.getByRole("button", { name: /Inicio/i });
    fireEvent.click(homeTabButton);

    // Should return to Home screen
    expect(screen.getByText("Av. Juan J. Paso 3535")).toBeInTheDocument();
  });
});
