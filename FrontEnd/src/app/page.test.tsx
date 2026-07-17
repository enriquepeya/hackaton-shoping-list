import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./page";

describe("Home PWA Layout", () => {
  it("renders the header and the default 'IA Assistant' tab view", () => {
    render(<Home />);
    
    // Check header
    expect(screen.getByText("List-Builder")).toBeInTheDocument();
    
    // Check main prompt title
    expect(screen.getByText("¿Qué necesitás hoy?")).toBeInTheDocument();
  });

  it("switches tabs when clicking on tab buttons", () => {
    render(<Home />);
    
    // Default view is 'IA Assistant' (build tab)
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
  });
});
