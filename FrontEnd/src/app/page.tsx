"use client";

import React, { useState, useEffect, useRef } from "react";

type Tab = "home" | "build" | "lists" | "checkout";

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
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [promptInput, setPromptInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaved] = useState(false);

  // Multimodal state and refs
  const [showLauncher, setShowLauncher] = useState(false);
  const [loadingType, setLoadingType] = useState<"text" | "image" | "audio" | null>(null);
  const [showCameraOptions, setShowCameraOptions] = useState(false);

  // OCR simulation states
  const [isOcrAnalyzing, setIsOcrAnalyzing] = useState(false);
  const [ocrStep, setOcrStep] = useState(0);

  // Share modal and Shared List View states (Requirements 3 & 4)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [sharedListView, setSharedListView] = useState<AIResponse | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
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
  const [newItemInput, setNewItemInput] = useState("");
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);

  const handleSaveGeneratedList = async () => {
    if (!generatedList) return;

    const listId = "list-" + Date.now();
    const listToSave: SavedList = {
      id: listId,
      title: generatedList.list_title,
      description: generatedList.description,
      vendorAssociated: generatedList.suggested_stores[activeStoreIndex]?.store_name || "PedidosYa Market",
      items: generatedList.items.map((it, iIdx) => ({
        sku: "sku-" + iIdx,
        description: it.name,
        quantity: it.quantity,
        addedByUserId: "user-123"
      }))
    };

    // Save locally
    setSavedLists(prev => [listToSave, ...prev]);

    // Also attempt to save to Go Hexagonal Backend
    try {
      const payload = {
        id: listId,
        title: generatedList.list_title,
        ownerId: "user-123",
        vendorAssociated: generatedList.suggested_stores[activeStoreIndex]?.store_name || "PedidosYa Market",
        items: generatedList.items.map((it, iIdx) => ({
          sku: "sku-" + iIdx,
          listId: listId,
          description: it.name,
          quantity: it.quantity
        }))
      };

      await fetch(`${BACKEND_URL}/api/v1/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn("Could not persist list to Go backend. Saved locally.", err);
    }

    alert("¡Lista guardada con éxito en Mis Listas! 🎉");
    setActiveTab("lists");
  };

  const handleDeleteItemFromGeneratedList = (idxToDelete: number) => {
    if (!generatedList) return;
    const updatedItems = generatedList.items.filter((_, idx) => idx !== idxToDelete);
    setGeneratedList({
      ...generatedList,
      items: updatedItems
    });
  };

  const handleAddNewItemToGeneratedList = (name: string, size: string = "1 u") => {
    if (!generatedList || !name.trim()) return;
    const newItem = {
      name: name,
      brand: "Genérico",
      quantity: 1,
      size: size
    };
    setGeneratedList({
      ...generatedList,
      items: [...generatedList.items, newItem]
    });
  };

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

  // Listen for 'share' query parameter on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const shareParam = params.get("share");
      if (shareParam) {
        // Set the shared list view mock data (Requirement 4)
        setSharedListView({
          list_title: "Lista compartida por tu amigo",
          description: "Ingredientes para asado completo compartidos mediante enlace.",
          items: [
            { name: "Vacio de novillo", brand: "Carnicería Express", quantity: 1, size: "1.5 kg" },
            { name: "Chorizo bombón", brand: "La Octava", quantity: 5, size: "500g" },
            { name: "Papas Fritas Lays", brand: "Lays", quantity: 2, size: "150 g" },
            { name: "Coca Cola Original", brand: "Coca-Cola", quantity: 2, size: "1.5L" }
          ],
          suggested_stores: [
            { store_name: "PedidosYa Market", total_price: 18500, eta: "15 - 20 min", badge: "Más rápido" }
          ]
        });
      }
    }
  }, []);

  const handleShareList = (title: string, listId: string = "list-abc") => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/?share=${listId}`;
      setShareUrl(url);
      setIsCopied(false);
      setShowShareModal(true);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Submit prompt / image / audio to API
  const handleGenerateList = async (
    promptText: string = "",
    payload?: string,
    type: "text" | "image" | "audio" = "text"
  ) => {
    const text = promptText || promptInput;
    if (type === "text" && !text.trim()) return;

    setIsLoading(true);
    setLoadingType(type);
    setGeneratedList(null);

    try {
      const bodyPayload: any = { type };
      if (type === "text") {
        bodyPayload.prompt = text;
      } else if (type === "image") {
        bodyPayload.image = payload;
      } else if (type === "audio") {
        bodyPayload.audio = payload;
      }

      const response = await fetch("/api/generate-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
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
      setLoadingType(null);
    }
  };

  // Triggered when an image file is captured/uploaded
  const triggerOcrAnalysis = (base64String: string) => {
    setIsOcrAnalyzing(true);
    setOcrStep(0);
    setActiveTab("build");
    setShowLauncher(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setOcrStep(step);
      if (step >= 5) {
        clearInterval(interval);
        setTimeout(async () => {
          setIsOcrAnalyzing(false);
          await handleGenerateList("", base64String, "image");
        }, 800);
      }
    }, 500);
  };

  // Read and convert chosen file to base64
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "audio"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingType(type);
    setGeneratedList(null);
    setActiveTab("build"); // Switches to AI Assistant tab to see the generation progress!
    setShowLauncher(false); // Closes the launcher drawer

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      if (type === "image") {
        triggerOcrAnalysis(base64String);
      } else {
        await handleGenerateList("", base64String, type);
      }
    };
    reader.readAsDataURL(file);
    
    // Clear input so selecting same file triggers change again
    e.target.value = "";
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
      {activeTab !== "home" && (
        <header className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-gray-800">List-Builder</span>
            <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">PWA</span>
          </div>
          <div className="flex space-x-2">
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-bold">Demo Mode</span>
          </div>
        </header>
      )}

      {/* Main viewport */}
      <section className="flex-1 overflow-y-auto bg-white pb-20">
        
        {/* TAB 0: HOME */}
        {activeTab === "home" && (
          <div className="flex flex-col min-h-full pb-24 bg-white select-none">
            {/* Red top section: Header, Status Bar, Address, Search and Banner */}
            <div className="bg-[#e21247] pb-8 rounded-b-[2.5rem] px-4 pt-3 text-white relative overflow-hidden shadow-lg shadow-red-100/50">
              
              {/* Status Bar */}
              <div className="flex justify-between items-center text-xs font-semibold tracking-wider opacity-95">
                <span>9:41</span>
                <div className="flex items-center space-x-1">
                  <span>📶</span>
                  <span>🛜</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* Delivery Address & Utility Icons */}
              <div className="flex justify-between items-center mt-3.5">
                <button className="flex items-center space-x-1.5 focus:outline-none active:scale-95 transition-transform">
                  <span className="text-base font-extrabold tracking-tight">Av. Juan J. Paso 3535</span>
                  <span className="text-xs">▼</span>
                </button>
                <div className="flex items-center space-x-3.5">
                  <button className="relative focus:outline-none active:scale-90 transition-transform">
                    <span className="text-xl">🔔</span>
                    <span className="absolute -top-1 -right-1 bg-white text-[#e21247] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#e21247]">
                      1
                    </span>
                  </button>
                  <button className="focus:outline-none active:scale-90 transition-transform" onClick={() => setActiveTab("checkout")}>
                    <span className="text-xl">🛒</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-full py-2 px-3 flex items-center justify-between w-full shadow-md mt-4 border border-red-200/20">
                <span className="text-gray-400 text-xs font-medium pl-2.5">Locales, platos y productos</span>
                <button className="bg-[#e21247] text-white p-1.5 rounded-full w-8 h-8 flex items-center justify-center focus:outline-none active:scale-95 transition-all">
                  <span className="text-xs">🔍</span>
                </button>
              </div>

              {/* Promo Banner inside the red block */}
              <div className="mt-5 flex justify-between items-center relative min-h-[140px]">
                
                {/* Promo Text (Left) */}
                <div className="flex-1 flex flex-col justify-center z-10">
                  <div className="bg-[#b91c1c] text-white text-[8px] font-black px-2 py-0.5 rounded-md w-max uppercase tracking-wide shadow-sm flex items-center gap-1">
                    <span className="text-[10px]">🔴</span> P Market
                  </div>
                  <h1 className="text-yellow-300 font-extrabold text-4xl tracking-tighter mt-1 filter drop-shadow">
                    60% OFF
                  </h1>
                  <p className="text-xs font-extrabold text-white tracking-wide mt-1 opacity-95">
                    En productos seleccionados
                  </p>
                </div>

                {/* Overlapping Products Displayed inside a Green background (Right) */}
                <div className="absolute right-[-15px] top-[-10px] w-[180px] h-[160px] bg-[#34d399] rounded-l-full opacity-90 z-0 shadow-inner flex items-center justify-center overflow-hidden">
                  
                  {/* Styled overlapping product representations */}
                  <div className="relative w-full h-full scale-90">
                    
                    {/* Tall Wine Bottle (Benjamin) in back-right */}
                    <div className="absolute right-5 bottom-12 w-12 h-24 bg-gradient-to-b from-[#14532d] to-[#166534] rounded-t-lg rounded-b-md shadow-lg border border-yellow-500/30 flex flex-col justify-between p-1 text-center transform rotate-6 z-0">
                      <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest scale-75 leading-none">B</span>
                      <span className="text-[8px] font-extrabold text-white leading-none">BENJA</span>
                      <span className="text-[14px]">🍾</span>
                    </div>

                    {/* Dishwash Soap (Magistral) in back-middle */}
                    <div className="absolute right-14 bottom-8 w-11 h-20 bg-gradient-to-b from-yellow-100 to-yellow-400 rounded-t-xl rounded-b-md shadow-md border border-yellow-300 flex flex-col justify-between p-1 text-center transform -rotate-6 z-10">
                      <span className="text-[6px] font-black text-blue-600 bg-white rounded uppercase leading-none py-0.5 px-0.5">MAGISTRAL</span>
                      <span className="text-[14px] leading-none">🧴</span>
                    </div>

                    {/* Chocolate Bar (Milka Oreo) in front-right */}
                    <div className="absolute right-2 bottom-3 w-16 h-10 bg-gradient-to-r from-purple-600 to-purple-800 rounded-md shadow-md border border-purple-400 flex flex-col justify-between p-1 transform rotate-3 z-20">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] font-black text-white leading-none">Milka</span>
                        <span className="text-[5px] font-extrabold text-blue-300 leading-none">OREO</span>
                      </div>
                      <span className="text-[12px] text-right mt-0.5">🍫</span>
                    </div>

                    {/* McCain Fries (McCain GOLAZO) in front-left */}
                    <div className="absolute left-4 bottom-5 w-16 h-14 bg-gradient-to-b from-blue-500 to-blue-700 rounded-lg shadow-lg border border-blue-400 flex flex-col justify-between p-1 transform -rotate-12 z-20">
                      <div className="flex justify-between items-start">
                        <span className="text-[6px] font-black text-white leading-none bg-red-600 px-0.5 rounded">McCain</span>
                        <span className="text-[5px] font-black text-yellow-300 leading-none">GOLAZO</span>
                      </div>
                      <span className="text-[16px] text-center leading-none">🍟</span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Slider Dots */}
              <div className="flex justify-center space-x-1.5 mt-5">
                <span className="bg-white w-4 h-1 rounded-full"></span>
                <span className="bg-white/40 w-1 h-1 rounded-full"></span>
                <span className="bg-white/40 w-1 h-1 rounded-full"></span>
              </div>

            </div>

            {/* Grid of Main Services (Restaurantes and P Market) */}
            <div className="px-4 mt-6 grid grid-cols-2 gap-4">
              
              {/* Card 1: Restaurantes */}
              <div 
                onClick={() => {
                  setPromptInput("Quiero pedir comida de restaurante");
                  setActiveTab("build");
                }}
                className="bg-[#f8fafc] rounded-3xl p-4 flex flex-col justify-between items-start h-36 border border-gray-100/50 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md active:scale-95 transition-all group"
              >
                <div className="text-6xl absolute right-1 top-2 select-none filter drop-shadow-md transform rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-6">
                  🍔
                </div>
                <div className="mt-auto">
                  <h3 className="text-base font-extrabold tracking-tight text-gray-900">Restaurantes</h3>
                </div>
              </div>

              {/* Card 2: P Market */}
              <div 
                onClick={() => {
                  setPromptInput("Quiero comprar en PedidosYa Market");
                  setActiveTab("build");
                }}
                className="bg-[#f8fafc] rounded-3xl p-4 flex flex-col justify-between items-start h-36 border border-gray-100/50 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md active:scale-95 transition-all group"
              >
                {/* Market items representation */}
                <div className="absolute right-1 top-2 text-5xl select-none filter drop-shadow-sm transform -rotate-12 transition-transform group-hover:scale-110 group-hover:-rotate-6">
                  🥦🍅🥫
                </div>
                
                <div className="mt-auto w-full flex flex-col items-start gap-1">
                  {/* Styled P Market logo */}
                  <div className="bg-[#e21247] text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <span>P</span> <span className="bg-white text-[#e21247] px-0.5 rounded-[1px] text-[6px]">Market</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Horizontal Categories Row */}
            <div className="mt-6">
              <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none px-4">
                
                {/* Category 1: Súper */}
                <div className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                  <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 relative overflow-hidden">
                    {/* Stylized Carrefour C logo */}
                    <div className="text-2xl font-black text-blue-700 select-none">
                      🛒
                    </div>
                    {/* Small tag */}
                    <span className="absolute bottom-1 bg-blue-600 text-white font-extrabold text-[5px] px-1 py-0.2 rounded uppercase">
                      Carrefour
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-800 text-center">Súper</span>
                </div>

                {/* Category 2: Helados */}
                <div className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                  <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                    <span className="text-3xl filter drop-shadow-sm">🍨</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800 text-center">Helados</span>
                </div>

                {/* Category 3: Café & Deli */}
                <div className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                  <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                    <span className="text-3xl filter drop-shadow-sm">☕</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800 text-center">Café & Deli</span>
                </div>

                {/* Category 4: Retiro */}
                <div className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                  <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                    <span className="text-3xl filter drop-shadow-sm">🛍️</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800 text-center">Retiro</span>
                </div>

              </div>
            </div>

            {/* Favorite Brands Horizontal Row */}
            <div className="mt-6 px-4">
              <div className="flex items-center justify-between pb-3">
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Locales Favoritos</h4>
              </div>
              <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none justify-between items-center">
                
                {/* Brand 1: McDonald's */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#da291c] border border-red-100 shadow-sm flex items-center justify-center font-bold text-yellow-400 text-xl cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  M
                </div>

                {/* Brand 2: Bullanga */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1e3a8a] border border-blue-200 shadow-sm flex items-center justify-center text-[10px] font-black text-white text-center p-1 leading-none uppercase tracking-tighter cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  BULLA
                </div>

                {/* Brand 3: Caffé del Popolo */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#27272a] border border-gray-700 shadow-sm flex items-center justify-center text-[8px] font-extrabold text-[#f5f5f4] text-center p-1 leading-none uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  CAFFÉ
                </div>

                {/* Brand 4: Togni's Pizza */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#d97706] border border-yellow-200 shadow-sm flex items-center justify-center text-xl cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  🍕
                </div>

                {/* Brand 5: Carrefour */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[#1e3a8a] font-black text-xs cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  🔵🔴
                </div>

              </div>
            </div>

            {/* Floating List Action Button (📋) to toggle launcher */}
            <button
              onClick={() => {
                setShowLauncher(prev => !prev);
                setShowCameraOptions(false); // Reset camera options state
              }}
              className="absolute bottom-20 right-4 z-40 bg-[#e21247] hover:bg-[#b91c1c] active:scale-95 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all border border-red-400/20"
              title="Abrir buscador cognitivo"
            >
              <span className="text-2xl filter drop-shadow-sm">📋</span>
            </button>

            {/* Glassmorphic "Armá tu lista" Bottom Panel with promo banner behind */}
            {showLauncher && (
              <div className="absolute bottom-16 left-0 right-0 p-4 pb-4 z-20 pointer-events-none flex flex-col justify-end">
                
                {/* Yellow Promo Banner behind */}
                <div className="bg-yellow-300 text-black text-center py-2 px-4 rounded-t-2xl font-extrabold text-[11px] uppercase tracking-wide border-t border-x border-yellow-400 shadow-sm mb-[-10px] flex items-center justify-between pointer-events-auto">
                  <span className="flex items-center gap-1">⏰ ¡Ahora hasta $2.500 de ahorro!</span>
                  <span className="bg-black text-yellow-300 px-1.5 py-0.5 rounded font-black text-[9px]">04:00</span>
                </div>

                {/* Glassmorphic container */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/40 pointer-events-auto flex flex-col gap-3 transition-all hover:scale-[1.01] hover:bg-white/90 relative">
                  
                  {/* Camera Sub-Options Popover (dropdown) */}
                  {showCameraOptions && (
                    <div className="absolute bottom-20 right-4 bg-white border border-gray-100 rounded-2xl shadow-xl p-2.5 z-30 flex flex-col gap-2 min-w-[170px] animate-fadeIn">
                      <button
                        onClick={() => {
                          setShowCameraOptions(false);
                          cameraInputRef.current?.click();
                        }}
                        className="flex items-center space-x-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 p-2 rounded-xl transition-all"
                      >
                        <span>📸</span>
                        <span>Tomar Foto (Cámara)</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCameraOptions(false);
                          uploadInputRef.current?.click();
                        }}
                        className="flex items-center space-x-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 p-2 rounded-xl transition-all"
                      >
                        <span>📁</span>
                        <span>Subir Foto (Galería)</span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                       Armá tu lista
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                      Sugerí un plato, asado o comida semanal y la IA armará tu lista.
                    </p>
                  </div>

                  {/* Input with buttons (interactive form) */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (promptInput.trim()) {
                        setActiveTab("build");
                        setShowLauncher(false);
                        handleGenerateList(promptInput, undefined, "text");
                      }
                    }}
                    className="flex items-center gap-2 w-full pointer-events-auto"
                  >
                    <div className="flex-1 bg-gray-100/90 rounded-2xl px-4 py-1.5 border border-gray-200/50 flex items-center transition-all focus-within:ring-2 focus-within:ring-[#e21247]/30">
                      <input
                        type="text"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Empezá tu lista..."
                        className="w-full bg-transparent text-sm font-semibold text-gray-800 focus:outline-none py-1.5"
                      />
                      <button 
                        type="submit" 
                        disabled={!promptInput.trim()}
                        className={`font-extrabold text-xs ml-2 uppercase tracking-wide focus:outline-none transition-all ${
                          promptInput.trim() ? "text-[#e21247] hover:scale-105 active:scale-95 cursor-pointer" : "text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        Enviar
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        audioInputRef.current?.click();
                      }}
                      title="Dictar lista (audio)"
                      className="w-12 h-12 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-2xl flex items-center justify-center border border-gray-200/50 cursor-pointer transition-all text-xl"
                    >
                      🎙️
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        setShowCameraOptions(prev => !prev);
                      }}
                      title="Analizar foto / subir imagen"
                      className={`w-12 h-12 active:scale-95 rounded-2xl flex items-center justify-center border cursor-pointer transition-all text-xl ${
                        showCameraOptions 
                          ? "bg-red-50 border-red-200 text-red-500" 
                          : "bg-gray-100 hover:bg-gray-200 border-gray-200/50"
                      }`}
                    >
                      📷
                    </button>
                  </form>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 1: BUILD (AI Assistant) */}
        {activeTab === "build" && (
          <div className="p-4 space-y-4">
            
            {/* Input prompt module (Requirement: Hidden when generatedList is active) */}
            {!generatedList && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-fadeIn">
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

                {/* Explicit Multimodal Action Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isLoading}
                    className="bg-red-50 hover:bg-red-100/80 text-[#e21247] border border-red-100 rounded-xl py-2 px-1 text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>🎙️ Dictar Voz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isLoading}
                    className="bg-red-50 hover:bg-red-100/80 text-[#e21247] border border-red-100 rounded-xl py-2 px-1 text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>📸 Tomar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isLoading}
                    className="bg-red-50 hover:bg-red-100/80 text-[#e21247] border border-red-100 rounded-xl py-2 px-1 text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>📁 Subir Foto</span>
                  </button>
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
                      {loadingType === "image" 
                        ? "🤖 Analizando foto de lista..." 
                        : loadingType === "audio"
                          ? "🎙️ Interpretando nota de voz..."
                          : "🤖 Generando Lista Inteligente..."
                      }
                    </span>
                  ) : (
                    "🤖 Generar Lista Inteligente"
                  )}
                </button>
              </div>
            )}

            {/* Generated results visualization (Requirements 1 & 2 - ejemplo-lista.png) */}
            {generatedList && (
              <div className="space-y-4 animate-fadeIn relative pb-40">
                
                {/* Status Bar Mockup */}
                <div className="flex justify-between items-center text-xs font-semibold tracking-wider opacity-90 px-2 -mt-2">
                  <span>9:41</span>
                  {/* Floating rounded bubble avatar in center */}
                  <div className="w-7 h-7 rounded-full bg-gray-200 border border-white flex items-center justify-center font-bold text-sm shadow-md">
                    👩
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>📶</span>
                    <span>🛜</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* Sub-Header Actions Row */}
                <div className="flex justify-between items-center px-1 border-b border-gray-50 pb-2">
                  <button
                    onClick={() => setGeneratedList(null)}
                    className="text-gray-600 hover:text-gray-900 font-extrabold text-xl p-1.5 focus:outline-none"
                    title="Volver"
                  >
                    ⟨
                  </button>
                  <div className="flex items-center space-x-3">
                    {/* Share icon */}
                    <button
                      onClick={() => handleShareList(generatedList.list_title, "list-123")}
                      className="text-gray-600 hover:text-gray-900 p-1.5 text-lg"
                      title="Compartir"
                    >
                      📤
                    </button>
                    {/* Collaborative Icon */}
                    <button
                      className="text-gray-600 hover:text-gray-900 p-1.5 text-lg"
                      title="Colaboradores"
                    >
                      👥
                    </button>
                    {/* Guardar Pill Button */}
                    <button
                      onClick={handleSaveGeneratedList}
                      className="bg-black hover:bg-gray-800 text-white font-black text-xs px-5 py-2 rounded-full shadow-sm transition-all active:scale-95"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="px-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black text-gray-950 tracking-tight">
                      {generatedList.list_title}
                    </h3>
                    <span className="text-lg text-gray-400 p-1 cursor-pointer hover:text-gray-600">✏️</span>
                  </div>
                  <p className="text-sm font-bold text-gray-600 mt-1">
                    {generatedList.description}
                  </p>
                </div>

                {/* Items Card List (rounded light gray card) */}
                <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-4 space-y-4">
                  {generatedList.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No hay productos en la lista. ¡Agregá algunos abajo!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {generatedList.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between animate-fadeIn">
                          <div className="flex items-center flex-1 mr-2">
                            {/* Check checkered square placeholder */}
                            <div className="w-12 h-12 bg-white/80 border border-gray-200/50 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0 relative select-none">
                              📦
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-extrabold text-gray-900 leading-tight text-left">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-400 font-bold mt-0.5 text-left">
                                {item.quantity} {item.size} • {item.brand}
                              </p>
                              
                              {/* Alert Octagons */}
                              {getOctagons(item).length > 0 && (
                                <div className="flex gap-1 pt-1 flex-wrap">
                                  {getOctagons(item).map((alert, oIdx) => (
                                    <span
                                      key={oIdx}
                                      className="bg-black text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider"
                                    >
                                      🛑 {alert.split(" ")[2]}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Trash delete button */}
                          <button
                            onClick={() => handleDeleteItemFromGeneratedList(idx)}
                            className="text-gray-400 hover:text-red-500 p-2 cursor-pointer transition-all active:scale-90"
                            title="Eliminar producto"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested Stores Selection (Compact) */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100/50 space-y-3 shadow-sm">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Elegí el comercio</h4>
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
                        <div>
                          <p className="text-xs font-extrabold text-gray-800 truncate">{store.store_name}</p>
                          {store.badge && (
                            <span className="bg-red-100 text-red-700 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">
                              {store.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-gray-900 mt-2">
                          ${store.total_price.toLocaleString("es-AR")}
                        </p>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md shadow-red-100 flex items-center justify-center space-x-2 uppercase tracking-wider"
                  >
                    <span>Continuar al checkout (${generatedList.suggested_stores[activeStoreIndex]?.total_price.toLocaleString("es-AR")})</span>
                    <span className="text-sm">👉</span>
                  </button>
                </div>

                {/* Collapsed Drawer Trigger Button (Requirement: Hidden/Show Drawer On-Demand) */}
                {!showBottomDrawer && (
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
                    <button
                      onClick={() => setShowBottomDrawer(true)}
                      className="pointer-events-auto bg-black hover:bg-gray-800 active:scale-95 text-white font-extrabold text-[10px] py-3 px-6 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider transition-all border border-gray-700/10"
                    >
                      <span>➕ Agregar / Ver Sugerencias</span>
                    </button>
                  </div>
                )}

                {/* Sliding input drawer / Add Item Suggestion Drawer (Requirement 1 - Show/Hide On-Demand) */}
                {showBottomDrawer && (
                  <div className="bg-white border-t border-gray-100 rounded-t-[2rem] p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] space-y-4 absolute bottom-0 left-0 right-0 z-30 animate-slideUp">
                    {/* Slider handle bar to collapse */}
                    <button 
                      type="button"
                      onClick={() => setShowBottomDrawer(false)}
                      className="w-12 h-1 bg-gray-200 hover:bg-gray-300 rounded-full mx-auto -mt-1.5 mb-2 block focus:outline-none cursor-pointer"
                      title="Ocultar"
                    ></button>
                    
                    {/* Text input with camera and mic trigger buttons */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newItemInput.trim()) {
                          handleAddNewItemToGeneratedList(newItemInput);
                          setNewItemInput("");
                        }
                      }}
                      className="flex items-center gap-2 pointer-events-auto"
                    >
                      <div className="flex-1 bg-gray-100 hover:bg-gray-200/50 rounded-2xl px-4 py-2.5 border border-gray-200/50 flex items-center transition-all focus-within:ring-2 focus-within:ring-red-500/30">
                        <input
                          type="text"
                          value={newItemInput}
                          onChange={(e) => setNewItemInput(e.target.value)}
                          placeholder="Qué necesitas"
                          className="w-full bg-transparent text-sm font-bold text-gray-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => audioInputRef.current?.click()}
                          className="text-gray-400 hover:text-gray-600 p-1 focus:outline-none text-base"
                          title="Dictar voz"
                        >
                          🎙️
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCameraOptions(prev => !prev)}
                        className="w-12 h-12 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-2xl flex items-center justify-center border border-gray-200/50 cursor-pointer text-xl"
                        title="Cámara"
                      >
                        📷
                      </button>
                    </form>

                    {/* Suggestions with + button list */}
                    <div className="space-y-2.5 pt-1 pointer-events-auto">
                      <div className="flex items-center justify-between bg-gray-50/50 border border-gray-100/50 p-3 rounded-2xl">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-white border border-gray-200/50 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                            🧀
                          </div>
                          <div className="ml-2.5">
                            <p className="text-xs font-extrabold text-gray-800 text-left">Queso feta</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5 text-left">500 gr.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddNewItemToGeneratedList("Queso feta", "500 gr.")}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg flex items-center justify-center font-black text-gray-600 cursor-pointer text-base"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-gray-50/50 border border-gray-100/50 p-3 rounded-2xl">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-white border border-gray-200/50 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                            🥣
                        </div>
                          <div className="ml-2.5">
                            <p className="text-xs font-extrabold text-gray-800 text-left">Granola con almendras</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5 text-left">200 gr.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddNewItemToGeneratedList("Granola con almendras", "200 gr.")}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg flex items-center justify-center font-black text-gray-600 cursor-pointer text-base"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* Empty landing view / Loading state card (Requirement 4 - Superposed Overlay Modal) */}
            {isOcrAnalyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 space-y-4 animate-scaleUp max-w-sm w-full mx-auto pointer-events-auto">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      🔍 IA LEYENDO MANUSCRITO
                    </h3>
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                  </div>
                  
                  {/* Simulated preview of the paper list */}
                  <div className="bg-yellow-50/70 border border-yellow-100 rounded-xl p-4 shadow-inner relative overflow-hidden h-44 flex flex-col justify-between text-left">
                    <div className="absolute right-2 top-2 text-2xl opacity-15">📝</div>
                    <div className="space-y-2.5 font-mono text-[10px] text-gray-600">
                      <p className={`transition-all duration-300 ${ocrStep >= 1 ? "opacity-100 text-green-700 font-extrabold" : "opacity-30"}`}>
                        [Línea 1] Leche entera x2 ................ [✓ LECTURA OK]
                      </p>
                      <p className={`transition-all duration-300 ${ocrStep >= 2 ? "opacity-100 text-green-700 font-extrabold" : "opacity-30"}`}>
                        [Línea 2] Huevos x6 ....................... [✓ LECTURA OK]
                      </p>
                      <p className={`transition-all duration-300 ${ocrStep >= 3 ? "opacity-100 text-green-700 font-extrabold" : "opacity-30"}`}>
                        [Línea 3] Harina de trigo x1 .............. [✓ LECTURA OK]
                      </p>
                      <p className={`transition-all duration-300 ${ocrStep >= 4 ? "opacity-100 text-green-700 font-extrabold" : "opacity-30"}`}>
                        [Línea 4] Tomates perita x1 ............... [✓ LECTURA OK]
                      </p>
                      <p className={`transition-all duration-300 ${ocrStep >= 5 ? "opacity-100 text-green-700 font-extrabold" : "opacity-30"}`}>
                        [Línea 5] Queso rallado x2 ................ [✓ LECTURA OK]
                      </p>
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-widest pt-2">
                      {ocrStep < 5 ? "Extrayendo productos..." : "Análisis completado de forma exitosa"}
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              </div>
            )}

            {!generatedList && isLoading && !isOcrAnalyzing && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-8 text-center space-y-4 max-w-sm mx-auto animate-pulse mt-8">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center text-3xl">
                  {loadingType === "image" ? "📸" : loadingType === "audio" ? "🎙️" : "🤖"}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-800">
                    {loadingType === "image" 
                      ? "Escaneando imagen con IA..." 
                      : loadingType === "audio"
                        ? "Escuchando nota de voz..."
                        : "Construyendo tu lista inteligente..."
                    }
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
                    {loadingType === "image"
                      ? "Estamos identificando los productos de la foto de tu lista de papel o ingredientes."
                      : loadingType === "audio"
                        ? "Estamos transcribiendo y abstrayendo productos de tu dictado."
                        : "Nuestra inteligencia artificial está ordenando los productos idóneos presentes en el backend."
                    }
                  </p>
                </div>
                <div className="flex justify-center pt-2">
                  <div className="w-6 h-6 border-2 border-[#e21247] border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            )}

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
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-[10px] text-gray-400 font-medium">20 productos</p>
                    <button
                      onClick={() => handleShareList("Desayuno", "list-desayuno")}
                      className="text-[9px] text-[#e21247] hover:underline font-extrabold flex items-center gap-0.5 focus:outline-none cursor-pointer"
                    >
                      🔗 Compartir
                    </button>
                  </div>
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
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-gray-400 font-medium">3 productos</p>
                    <button
                      onClick={() => handleShareList("Desayuno Martínez", "list-martinez")}
                      className="text-[9px] text-[#e21247] hover:underline font-extrabold flex items-center gap-0.5 focus:outline-none cursor-pointer"
                    >
                      🔗 Compartir
                    </button>
                  </div>
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
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-gray-400 font-medium text-left">
                        {list.items.reduce((sum, item) => sum + item.quantity, 0)} productos
                      </p>
                      <button
                        onClick={() => handleShareList(list.title, list.id)}
                        className="text-[9px] text-[#e21247] hover:underline font-extrabold flex items-center gap-0.5 focus:outline-none cursor-pointer"
                      >
                        🔗 Compartir
                      </button>
                    </div>
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
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-30">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-all ${
            activeTab === "home" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">🏠</span>
          <span>Inicio</span>
        </button>
        <button
          onClick={() => setActiveTab("build")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-all ${
            activeTab === "build" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">🧠</span>
          <span>IA Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab("lists")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-all ${
            activeTab === "lists" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">📋</span>
          <span>Mis Listas</span>
        </button>
        <button
          onClick={() => setActiveTab("checkout")}
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-all ${
            activeTab === "checkout" ? "text-red-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg mb-0.5">🛒</span>
          <span>Checkout</span>
        </button>
      </nav>

      {/* Hidden file input receptors mounted globally for camera, upload, and audio capturing */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, "image")} 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={uploadInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, "image")} 
      />
      <input 
        type="file" 
        accept="audio/*" 
        ref={audioInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, "audio")} 
      />

      {/* Share Modal Dialog (Requirements 3 & 4) */}
      {showShareModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-gray-100 animate-scaleUp pointer-events-auto">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-1.5">
                🔗 Compartir Lista
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500">
              ¡Cualquier persona con este enlace podrá ver, modificar o importar esta lista directamente en su propia aplicación!
            </p>

            {/* Input URL field with Copy button */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-600 truncate mr-2 flex-1">
                {shareUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className={`flex-shrink-0 font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all ${
                  isCopied 
                    ? "bg-green-500 text-white" 
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {isCopied ? "✓ ¡Copiado!" : "Copiar"}
              </button>
            </div>

            {/* Simulated Share Targets (WhatsApp, Slack, Email) */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <a 
                href={`https://wa.me/?text=${encodeURIComponent("Mirá mi lista de compras en PedidosYa: " + shareUrl)}`} 
                target="_blank" 
                rel="noreferrer"
                className="bg-green-50 hover:bg-green-100 border border-green-100 rounded-xl p-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-xl">💬</span>
                <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">WhatsApp</span>
              </a>
              <button 
                onClick={handleCopyLink}
                className="bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl p-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-xl">🤖</span>
                <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">Slack</span>
              </button>
              <button 
                onClick={() => {
                  window.location.href = `?share=list-123`;
                  setShowShareModal(false);
                }}
                className="bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl p-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 animate-pulse"
              >
                <span className="text-xl">📱</span>
                <span className="text-[9px] font-bold text-[#e21247] uppercase tracking-wide">Ver Vista</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TAB X: SHARED LIST PREVIEW SCREEN (Requirement 4) */}
      {sharedListView && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col justify-between animate-fadeIn">
          {/* Header */}
          <header className="bg-[#e21247] p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📋</span>
              <span className="text-base font-extrabold tracking-tight">Lista Compartida</span>
            </div>
            <button 
              onClick={() => {
                setSharedListView(null);
                // Clear URL share param
                if (typeof window !== "undefined") {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
              }}
              className="text-xs bg-black/20 hover:bg-black/40 text-white font-extrabold px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              Cerrar
            </button>
          </header>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-20">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-800">{sharedListView.list_title}</h3>
              <p className="text-xs text-gray-500 mt-1">{sharedListView.description}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                Productos recomendados
              </h4>
              <div className="space-y-3 divide-y divide-gray-50">
                {sharedListView.items.map((item, idx) => (
                  <div key={idx} className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">Marca: {item.brand} • {item.size}</p>
                    </div>
                    <span className="text-xs bg-red-50 text-red-600 font-extrabold px-2.5 py-1 rounded-md">
                      x{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                Proveedor sugerido
              </h4>
              {sharedListView.suggested_stores.map((store, sIdx) => (
                <div key={sIdx} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-gray-800">{store.store_name}</p>
                    <p className="text-gray-400">ETA: {store.eta}</p>
                  </div>
                  <p className="font-extrabold text-gray-900 text-sm">
                    ${store.total_price.toLocaleString("es-AR")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Import Action Bottom Panel */}
          <div className="bg-white p-4 border-t border-gray-100 flex gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20">
            <button
              onClick={() => {
                // Import the list into savedLists
                const newList: SavedList = {
                  id: "list-imported-" + Date.now(),
                  title: sharedListView.list_title,
                  description: sharedListView.description,
                  vendorAssociated: sharedListView.suggested_stores[0]?.store_name || "PedidosYa Market",
                  items: sharedListView.items.map((it, iIdx) => ({
                    sku: "sku-imp-" + iIdx,
                    description: it.name,
                    quantity: it.quantity,
                    addedByUserId: "user-imported"
                  }))
                };
                
                // Save list locally
                setSavedLists(prev => [newList, ...prev]);
                setSharedListView(null);
                setActiveTab("lists");
                
                // Clear URL query param
                if (typeof window !== "undefined") {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }

                alert("¡Lista importada con éxito a 'Mis Listas'! 🎉");
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md shadow-red-100 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              📥 Importar a mis listas
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
