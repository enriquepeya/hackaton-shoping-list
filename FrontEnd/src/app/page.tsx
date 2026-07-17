"use client";

import React, { useState } from "react";

type Tab = "build" | "lists" | "checkout";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("build");

  return (
    <main className="max-w-md w-full min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* 1. Header */}
      <header className="bg-red-600 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">List-Builder</span>
          <span className="bg-white text-red-600 text-xs font-extrabold px-1.5 py-0.5 rounded-full uppercase">PWA</span>
        </div>
        <div className="flex space-x-2">
          <span className="text-xs bg-red-700 px-2 py-1 rounded-full text-red-100 font-medium">Demo Mode</span>
        </div>
      </header>

      {/* 2. Main Scrollable Content */}
      <section className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-20">
        {activeTab === "build" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-1">¿Qué necesitás hoy?</h2>
              <p className="text-xs text-gray-500 mb-3">Pedí por lenguaje natural y la IA armará tu lista de compras perfecta.</p>
              <textarea
                placeholder="Ej. Quiero hacer comida para toda la semana con desayuno proteico..."
                className="w-full h-24 text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-full transition-all">
                  🔥 Asado Día del amigo
                </button>
                <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-full transition-all">
                  🍳 Desayuno proteico
                </button>
                <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-full transition-all">
                  🥗 Cena saludable
                </button>
              </div>
            </div>

            {/* Empty state placeholder for now */}
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl">🤖</span>
              <p className="text-sm font-medium mt-2">La IA está lista para construir tu lista.</p>
              <p className="text-xs mt-1">Escribí o seleccioná una sugerencia arriba.</p>
            </div>
          </div>
        )}

        {activeTab === "lists" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Mis listas guardadas</h2>
            {/* Empty state */}
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <span className="text-4xl text-gray-300">📋</span>
              <p className="text-sm font-semibold text-gray-700 mt-3">No tenés listas guardadas aún</p>
              <p className="text-xs text-gray-400 mt-1">Las listas que generes y confirmes aparecerán acá.</p>
            </div>
          </div>
        )}

        {activeTab === "checkout" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Elegí el local más conveniente</h2>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center text-gray-500">
              <p className="text-sm">Primero debés generar una lista en la sección de IA.</p>
            </div>
          </div>
        )}
      </section>

      {/* 3. Bottom Mobile Tabs Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
        <button
          onClick={() => setActiveTab("build")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-all ${
            activeTab === "build" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">🧠</span>
          <span>IA Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab("lists")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-all ${
            activeTab === "lists" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">📋</span>
          <span>Mis Listas</span>
        </button>
        <button
          onClick={() => setActiveTab("checkout")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-all ${
            activeTab === "checkout" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">🛒</span>
          <span>Checkout</span>
        </button>
      </nav>
    </main>
  );
}
