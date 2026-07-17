"use client";

import React, { useState, useEffect } from "react";

type Tab = "build" | "lists" | "checkout";

interface AIItem {
  name: string;
  brand: string;
  quantity: number;
  size: string;
}

interface SuggestedStore {
  store_name: string;
  total_price: number;
  eta: string;
  badge: string;
}

interface AIResponse {
  list_title: string;
  description: string;
  items: AIItem[];
  suggested_stores: SuggestedStore[];
}

interface SavedItem {
  sku: string;
  description: string;
  quantity: number;
  addedByUserId: string;
}

interface SavedList {
  id: string;
  title: string;
  description: string;
  vendorAssociated: string;
  items: SavedItem[];
}

const BACKEND_URL = "http://localhost:8080";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("build");
  const [promptInput, setPromptInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaved] = useState(false);
  
  // Active generated list state
  const [generatedList, setGeneratedList] = useState<AIResponse | null>(null);
  const [activeStoreIndex, setActiveStoreIndex] = useState<number>(0);
  
  // Checkout flow state
  const [priorityShipping, setPriorityShipping] = useState(false);
  const [riderTip, setRiderTip] = useState<number>(0);
  const [address, setAddress] = useState("Av. Corrientes 1234, CABA");
  const [instructions, setInstructions] = useState("Dejar en recepción");
  
  // Success state
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(8);

  // Saved lists from Go backend (with local mockup fallback)
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);

  // Fetch saved lists from Go Hexagonal Backend
  const fetchSavedLists = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/lists/user-123`);
      if (response.ok) {
        const data = await response.json();
        // Map backend schema (camelCase / properties) to frontend state
        const lists = (data || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description || "Lista de compras",
          vendorAssociated: l.vendorAssociated || "Supermercado",
          items: (l.items || []).map((it: any) => ({
            sku: it.sku,
            description: it.description,
            quantity: it.quantity,
            addedByUserId: it.addedByUserId
          }))
        }));
        setSavedLists(lists);
      }
    } catch (err) {
      console.warn("Go Backend not reachable. Using local simulated memory for lists.", err);
    }
  };

  // Run fetch on mount and on 'lists' tab activation
  useEffect(() => {
    fetchSavedLists();
  }, [activeTab]);

  // Automatic redirect timer on Success Screen
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && successCountdown > 0) {
      timer = setTimeout(() => {
        setSuccessCountdown(prev => prev - 1);
      }, 1000);
    } else if (isSuccess && successCountdown === 0) {
      setIsSuccess(false);
      setActiveTab("lists");
      setSuccessCountdown(8);
    }
    return () => clearTimeout(timer);
  }, [isSuccess, successCountdown]);

  // Submit prompt to API
  const handleGenerateList = async (promptText: string) => {
    const text = promptText || promptInput;
    if (!text.trim()) return;

    setIsLoading(true);
    setGeneratedList(null);

    try {
      const response = await fetch("/api/generate-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text })
      });
      
      if (response.ok) {
        const data: AIResponse = await response.json();
        setGeneratedList(data);
        setActiveStoreIndex(0); // reset store tab selection
      }
    } catch (err) {
      console.error("Error generating list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick chips helper
  const handleChipClick = (suggestion: string, promptText: string) => {
    setPromptInput(promptText);
    handleGenerateList(promptText);
  };

  // Helper to determine octagons (nutritional alerts) based on brand/name
  const getOctagons = (item: AIItem) => {
    const name = item.name.toLowerCase();
    const brand = item.brand.toLowerCase();
    
    const octagons: string[] = [];
    if (brand.includes("lays") || name.includes("papas") || brand.includes("doritos") || brand.includes("takis")) {
      octagons.push("EXCESO EN SODIO", "EXCESO EN GRASAS");
    }
    if (brand.includes("coca") || name.includes("leche") || name.includes("gaseosa") || name.includes("yogurt")) {
      octagons.push("EXCESO EN AZÚCARES");
    }
    if (brand.includes("branca") || name.includes("fernet")) {
      octagons.push("EXCESO EN CALORÍAS");
    }
    return octagons;
  };

  // Checkout Math
  const basePrice = generatedList?.suggested_stores[activeStoreIndex]?.total_price || 0;
  const deliveryFee = 2000;
  const priorityFee = priorityShipping ? 750 : 0;
  const totalPrice = basePrice + deliveryFee + priorityFee + riderTip;

  // Confirm and go to checkout tab
  const handleProceedToCheckout = () => {
    setActiveTab("checkout");
  };

  // Save list to Go hexagonal backend API
  const saveCurrentListToBackend = async () => {
    if (!generatedList) return;
    setIsSaved(true);

    const storeName = generatedList.suggested_stores[activeStoreIndex]?.store_name || "PedidosYa Market";
    const payload = {
      title: generatedList.list_title,
      vendorAssociated: storeName,
      ownerId: "user-123",
      listType: "PRIVATE",
      isSharable: true,
      image: "https://example.com/images/list.jpg",
      items: generatedList.items.map(it => ({
        sku: "SKU-" + Math.floor(1000 + Math.random() * 9000),
        description: `${it.name} (${it.brand}) ${it.size}`,
        quantity: it.quantity,
        addedByUserId: "user-123"
      }))
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchSavedLists();
      } else {
        // Fallback simulated local persistency if backend rejected or is configured strictly
        simulateLocalSave(payload);
      }
    } catch (err) {
      console.warn("Could not save to Go Backend. Saving locally inside client mock memory.", err);
      simulateLocalSave(payload);
    } finally {
      setIsSaved(false);
    }
  };

  const simulateLocalSave = (payload: any) => {
    const newList: SavedList = {
      id: "list-" + Math.random().toString(36).substr(2, 9),
      title: payload.title,
      description: generatedList?.description || "Simulated list",
      vendorAssociated: payload.vendorAssociated,
      items: payload.items.map((it: any) => ({
        sku: it.sku,
        description: it.description,
        quantity: it.quantity,
        addedByUserId: it.addedByUserId
      }))
    };
    setSavedLists(prev => [newList, ...prev]);
  };

  // Confirm order (trigger Success screen & persist to backend)
  const handlePlaceOrder = async () => {
    setIsSuccess(true);
    await saveCurrentListToBackend();
  };

  if (isSuccess) {
    return (
      <main className="max-w-md w-full min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col justify-between p-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-4xl animate-bounce">
            🎉
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">¡Gracias por tu pedido!</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            Tu orden está siendo procesada en <strong className="text-gray-700">{generatedList?.suggested_stores[activeStoreIndex]?.store_name}</strong>.
          </p>

          <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left space-y-3">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Resumen de Lista Generada</h3>
            <div className="border-b border-gray-200 pb-2">
              <p className="text-sm font-bold text-gray-800">{generatedList?.list_title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{generatedList?.description}</p>
            </div>
            <p className="text-xs text-gray-400 font-semibold text-center">
              Total pagado: ${totalPrice.toLocaleString("es-AR")}
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => {
                setIsSuccess(false);
                setActiveTab("lists");
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-red-100"
            >
              Guardar lista para después
            </button>
            <p className="text-xs text-gray-400">
              Redirigiendo automáticamente a "Mis listas" en <span className="font-bold text-red-500">{successCountdown}</span> segundos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md w-full min-h-screen bg-white shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight text-gray-800">List-Builder</span>
          <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">PWA</span>
        </div>
        <div className="flex space-x-2">
          <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-bold">Demo Mode</span>
        </div>
      </header>

      {/* Main viewport */}
      <section className="flex-1 overflow-y-auto bg-white pb-20">
        
        {/* TAB 1: BUILD (AI Assistant) */}
        {activeTab === "build" && (
          <div className="p-4 space-y-4">
            
            {/* Input prompt module */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-1">¿Qué necesitás hoy?</h2>
              <p className="text-xs text-gray-500 mb-3">Pedí por lenguaje natural y la IA armará tu lista de compras perfecta.</p>
              
              <div className="relative">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ej. Quiero hacer comida para toda la semana con desayuno proteico..."
                  className="w-full h-24 text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => handleChipClick("Asado", "Quiero hacer un asado para mis amigos")}
                  className="text-xs bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold px-3 py-1.5 rounded-full transition-all"
                  disabled={isLoading}
                >
                  🔥 Asado Día del amigo
                </button>
                <button
                  onClick={() => handleChipClick("Desayuno", "Quiero desayuno proteico para toda la semana")}
                  className="text-xs bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold px-3 py-1.5 rounded-full transition-all"
                  disabled={isLoading}
                >
                  🍳 Desayuno proteico
                </button>
                <button
                  onClick={() => handleChipClick("Cena", "Cena saludable rápida wraps de pollo")}
                  className="text-xs bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-semibold px-3 py-1.5 rounded-full transition-all"
                  disabled={isLoading}
                >
                  🥗 Cena rápida wraps
                </button>
              </div>

              <button
                onClick={() => handleGenerateList("")}
                disabled={isLoading || !promptInput.trim()}
                className={`w-full mt-4 font-bold py-3 px-4 rounded-xl transition-all shadow-md ${
                  isLoading || !promptInput.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-red-600 hover:bg-red-700 text-white shadow-red-100"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    🤖 Generando Lista Inteligente...
                  </span>
                ) : (
                  "🤖 Generar Lista Inteligente"
                )}
              </button>
            </div>

            {/* Generated results visualization */}
            {generatedList && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Result header details */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-extrabold text-gray-800">{generatedList.list_title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{generatedList.description}</p>
                </div>

                {/* Items container details */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Productos de la lista</h4>
                    <span className="text-xs bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full">
                      {generatedList.items.length} items
                    </span>
                  </div>

                  <div className="space-y-3 divide-y divide-gray-50">
                    {generatedList.items.map((item, idx) => (
                      <div key={idx} className="pt-2 flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-400">Marca: {item.brand} • Tam: {item.size}</p>
                          
                          {/* Alert Octagons implementation */}
                          {getOctagons(item).length > 0 && (
                            <div className="flex gap-1.5 pt-1">
                              {getOctagons(item).map((alert, oIdx) => (
                                <span
                                  key={oIdx}
                                  className="bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wide border border-black"
                                >
                                  🛑 {alert}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-gray-100 text-gray-600 font-extrabold px-2.5 py-1 rounded-md">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Stores Module */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Elegí el local más conveniente</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {generatedList.suggested_stores.map((store, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => setActiveStoreIndex(sIdx)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          activeStoreIndex === sIdx
                            ? "border-red-500 bg-red-50/30 shadow-sm"
                            : "border-gray-100 hover:border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold text-gray-800">{store.store_name}</span>
                          {store.badge && (
                            <span className="bg-red-100 text-red-700 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full uppercase">
                              {store.badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5">
                          <p className="text-xs text-gray-400">Entrega: {store.eta}</p>
                          <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                            ${store.total_price.toLocaleString("es-AR")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-red-100 flex items-center justify-center space-x-2"
                  >
                    <span>Continuar al checkout</span>
                    <span className="text-sm">👉</span>
                  </button>
                </div>

              </div>
            )}

            {/* Empty landing view */}
            {!generatedList && !isLoading && (
              <div className="text-center py-16 text-gray-400 space-y-4">
                <span className="text-6xl animate-pulse inline-block">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-gray-600">La IA está lista para construir tu lista.</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Pedí un asado, un desayuno o ingredientes para tus comidas semanales y mirá las alertas nutricionales al instante.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: LISTS (HIGH FIDELITY DESIGN FROM SCREENSHOT) */}
        {activeTab === "lists" && (
          <div className="space-y-6 pt-4">
            
            {/* Centered header label exactly as design */}
            <div className="text-center border-b border-gray-100 pb-3">
              <h1 className="text-lg font-black text-gray-900 tracking-tight">Listas</h1>
            </div>

            {/* Section 1: Mis listas */}
            <div className="space-y-3 px-4">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Mis listas</h2>
              
              <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-none">
                
                {/* 1. Crear nueva card */}
                <div 
                  onClick={() => setActiveTab("build")}
                  className="flex-shrink-0 w-32 cursor-pointer group"
                >
                  <div className="w-32 h-32 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-100/50 transition-all">
                    <span className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md shadow-red-200">
                      +
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-2 text-left">Crear nueva</p>
                </div>

                {/* 2. Hardcoded Desayuno list with user avatars */}
                <div className="flex-shrink-0 w-32">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2 relative flex flex-col justify-between">
                    {/* Collaborative Avatars stacking at the top left */}
                    <div className="absolute -top-1.5 -left-1 flex -space-x-1.5 z-10 scale-90">
                      <span className="w-5 h-5 rounded-full border border-white bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">👩</span>
                      <span className="w-5 h-5 rounded-full border border-white bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">👨</span>
                      <span className="w-5 h-5 rounded-full border border-white bg-green-500 text-[8px] text-white flex items-center justify-center font-bold">👦</span>
                    </div>

                    {/* 2x2 Image cells wrapper */}
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">💧</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍌</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍪</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🧼</div>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-2 text-left">Desayuno</p>
                  <p className="text-[10px] text-gray-400 font-medium text-left">20 productos</p>
                </div>

                {/* 3. Hardcoded Café Martínez Desayuno list */}
                <div className="flex-shrink-0 w-32">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2 relative">
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">☕</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🥐</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍰</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍫</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="border border-gray-200 text-gray-700 text-[7px] font-black px-1 py-0.5 rounded uppercase leading-none bg-white">
                      MARTÍNEZ
                    </span>
                    <span className="text-xs font-bold text-gray-800 leading-none">Desayuno</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium text-left mt-0.5">3 productos</p>
                </div>

                {/* Dynamically created lists from the Go hexagonal backend! */}
                {savedLists.map((list) => (
                  <div key={list.id} className="flex-shrink-0 w-32 animate-fadeIn">
                    <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-red-100 p-2 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-1.5 h-full">
                        {list.items.slice(0, 4).map((it, iIdx) => (
                          <div key={iIdx} className="bg-white rounded-lg flex items-center justify-center text-xs border border-gray-100 font-bold text-red-500">
                            {it.description.toLowerCase().includes("asado") || it.description.toLowerCase().includes("vacio") || it.description.toLowerCase().includes("chorizo") ? "🥩" : "🛒"}
                          </div>
                        ))}
                        {list.items.length < 4 && Array.from({ length: 4 - list.items.length }).map((_, rIdx) => (
                          <div key={rIdx} className="bg-white rounded-lg border border-gray-100/50 flex items-center justify-center text-gray-200">
                            •
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-2">
                      <span className="bg-red-50 text-red-600 text-[7px] font-black px-1 py-0.5 rounded uppercase leading-none border border-red-100">
                        {list.vendorAssociated.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-gray-800 leading-none truncate">{list.title}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium text-left mt-0.5">
                      {list.items.reduce((sum, item) => sum + item.quantity, 0)} productos
                    </p>
                  </div>
                ))}

              </div>
            </div>

            {/* Section 2: Sugerencias */}
            <div className="space-y-3 px-4">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Sugerencias</h2>
              
              <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-none">
                
                {/* Sugerencias Card 1 */}
                <div className="flex-shrink-0 w-32 cursor-pointer" onClick={() => {
                  setPromptInput("Compra para toda la semana");
                  handleGenerateList("Compra para toda la semana");
                  setActiveTab("build");
                }}>
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2">
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">💧</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍌</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍪</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🧼</div>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-2 text-left">Para toda la semana</p>
                  <p className="text-[10px] text-gray-400 font-medium text-left">20 productos</p>
                </div>

                {/* Sugerencias Card 2 */}
                <div className="flex-shrink-0 w-32 cursor-pointer" onClick={() => {
                  setPromptInput("Desayuno Martínez");
                  handleGenerateList("Desayuno Martínez");
                  setActiveTab("build");
                }}>
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2">
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">☕</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🥐</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍰</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍫</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="border border-gray-200 text-gray-700 text-[7px] font-black px-1 py-0.5 rounded uppercase leading-none bg-white">
                      MARTÍNEZ
                    </span>
                    <span className="text-xs font-bold text-gray-800 leading-none">Desayuno</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium text-left mt-0.5">3 productos</p>
                </div>

                {/* Sugerencias Card 3 (Wrap de Pollo Almacen de Pizzas) */}
                <div className="flex-shrink-0 w-32 cursor-pointer" onClick={() => {
                  setPromptInput("Wrap de Pollo Almacen");
                  handleGenerateList("Wrap de Pollo Almacen");
                  setActiveTab("build");
                }}>
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2 flex items-center justify-center overflow-hidden">
                    {/* Big beautiful Wrap Emoji & styled design */}
                    <span className="text-6xl filter drop-shadow-sm">🌯</span>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="bg-black text-white text-[7px] font-black px-1 py-0.5 rounded uppercase leading-none">
                      ALMACÉN
                    </span>
                    <span className="text-xs font-bold text-gray-800 leading-none">Wrap de Pollo</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium text-left mt-0.5">1 productos</p>
                </div>

              </div>
            </div>

            {/* Section 3: Patrocinadas */}
            <div className="space-y-3 px-4 pb-4">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Patrocinadas</h2>
              
              <div className="flex overflow-x-auto gap-4 pb-3 scrollbar-none">
                
                {/* Patrocinadas Card 1 */}
                <div className="flex-shrink-0 w-32">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2">
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">💧</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍌</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍪</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🧼</div>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-2 text-left">Para toda la semana</p>
                  <p className="text-[10px] text-gray-400 font-medium text-left">20 productos</p>
                </div>

                {/* Patrocinadas Card 2 */}
                <div className="flex-shrink-0 w-32">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2">
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">☕</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🥐</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍰</div>
                      <div className="bg-white rounded-lg flex items-center justify-center text-base border border-gray-100">🍫</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="border border-gray-200 text-gray-700 text-[7px] font-black px-1 py-0.5 rounded uppercase leading-none bg-white">
                      MARTÍNEZ
                    </span>
                    <span className="text-xs font-bold text-gray-800 leading-none">Desayuno</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium text-left mt-0.5">3 productos</p>
                </div>

                {/* Patrocinadas Card 3 */}
                <div className="flex-shrink-0 w-32">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl border border-gray-100/50 p-2 flex items-center justify-center overflow-hidden">
                    <span className="text-6xl filter drop-shadow-sm">🌯</span>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="bg-black text-white text-[7px] font-black px-1 py-0.5 rounded uppercase leading-none">
                      ALMACÉN
                    </span>
                    <span className="text-xs font-bold text-gray-800 leading-none">Wrap de Pollo</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium text-left mt-0.5">1 productos</p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 3: CHECKOUT */}
        {activeTab === "checkout" && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Finalizá tu compra</h2>

            {!generatedList ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100 space-y-3">
                <span className="text-5xl text-gray-200 block">🛒</span>
                <p className="text-sm font-bold text-gray-700">Tu carrito de checkout está vacío</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Por favor, ve a la sección "IA Assistant" para armar una propuesta de lista inteligente primero.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Store selection header */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Local seleccionado</h3>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {generatedList.suggested_stores[activeStoreIndex]?.store_name}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-extrabold px-2.5 py-1 rounded-full">
                    {generatedList.suggested_stores[activeStoreIndex]?.eta}
                  </span>
                </div>

                {/* Shipping address & priority options */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3.5">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Datos de envío</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Dirección de entrega</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-sm font-semibold border-b border-gray-200 py-1 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Instrucciones de entrega</label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full text-sm font-semibold border-b border-gray-200 py-1 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Priority shipping check toggle */}
                  <div className="flex items-center justify-between bg-red-50/20 p-2.5 rounded-lg border border-red-100/50">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">⚡</span>
                      <div>
                        <p className="text-xs font-bold text-red-600">Envío prioritario</p>
                        <p className="text-[10px] text-gray-400">Llega 10 min antes directamente a tu casa</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={priorityShipping}
                      onChange={(e) => setPriorityShipping(e.target.checked)}
                      className="w-4.5 h-4.5 accent-red-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Tips options button group */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Propina para el rider</h4>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      El 100% va al rider
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 700, 1000, 1500, 2000].map((tipVal) => (
                      <button
                        key={tipVal}
                        onClick={() => setRiderTip(tipVal)}
                        className={`text-xs font-extrabold py-2.5 rounded-lg border transition-all ${
                          riderTip === tipVal
                            ? "border-red-500 bg-red-600 text-white"
                            : "border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {tipVal === 0 ? "Ahora no" : `$${tipVal}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purchase summary */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2.5">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Resumen de costos</h4>
                  
                  <div className="space-y-1.5 text-xs text-gray-500 font-semibold">
                    <div className="flex justify-between">
                      <span>Subtotal Productos</span>
                      <span className="text-gray-800">${basePrice.toLocaleString("es-AR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Costo de envío estándar</span>
                      <span className="text-gray-800">${deliveryFee.toLocaleString("es-AR")}</span>
                    </div>
                    {priorityShipping && (
                      <div className="flex justify-between text-red-600 font-bold">
                        <span>Envío prioritario</span>
                        <span>+ $750</span>
                      </div>
                    )}
                    {riderTip > 0 && (
                      <div className="flex justify-between text-gray-600 font-bold">
                        <span>Propina para el repartidor</span>
                        <span>+ ${riderTip.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2.5 flex justify-between text-sm font-extrabold text-gray-900">
                      <span>Total final</span>
                      <span>${totalPrice.toLocaleString("es-AR")}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-red-100 text-center"
                  >
                    Confirmar y realizar pedido 🛒
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

      </section>

      {/* Tabs Navigation */}
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
