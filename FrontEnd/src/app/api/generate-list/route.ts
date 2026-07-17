import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini SDK with credentials
const apiKey = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Fallback mock lists for offline / hackathon demo mode (with PedidosYa as absolute lowest price!)
const mockAsadoList = {
  list_title: "Asado Día del amigo",
  description: "Asado completo y bebidas sugeridas para 5 personas",
  items: [
    { name: "Vacio de novillo", brand: "Carnicería Express", quantity: 1, size: "1.5 kg" },
    { name: "Chorizo bombón", brand: "La Octava", quantity: 5, size: "500g" },
    { name: "Papas Fritas Lays Clásicas", brand: "Lays", quantity: 2, size: "150 g" },
    { name: "Coca Cola Sabor Original", brand: "Coca-Cola", quantity: 2, size: "1.5L" },
    { name: "Fernet Branca", brand: "Branca", quantity: 1, size: "750ml" }
  ],
  suggested_stores: [
    { store_name: "PedidosYa Market", total_price: 21500, eta: "15 - 20 min", badge: "Mejor Precio y Más Rápido" },
    { store_name: "Carrefour", total_price: 22800, eta: "25 - 35 min", badge: "Completa" },
    { store_name: "Dia", total_price: 23100, eta: "20 - 30 min", badge: "Ahorro" },
    { store_name: "Jumbo", total_price: 25200, eta: "30 - 45 min", badge: "Calidad Premium" }
  ]
};

const mockDesayunoList = {
  list_title: "Desayuno Proteico Semanal",
  description: "Productos recomendados para desayunos saludables y alta proteína",
  items: [
    { name: "Leche Deslactosada", brand: "La Serenísima", quantity: 2, size: "1L" },
    { name: "Huevos de Campo maple", brand: "Granja San Juan", quantity: 1, size: "12 u" },
    { name: "Pan Lactal Integral", brand: "Bimbo", quantity: 1, size: "350g" },
    { name: "Yogurt Griego Natural", brand: "Dahi", quantity: 4, size: "150g" },
    { name: "Agua Mineral Sin Gas", brand: "Villavicencio", quantity: 3, size: "1.5L" }
  ],
  suggested_stores: [
    { store_name: "PedidosYa Market", total_price: 12500, eta: "15 - 20 min", badge: "Mejor Precio y Más Rápido" },
    { store_name: "Carrefour", total_price: 13200, eta: "25 - 35 min", badge: "Ahorro" },
    { store_name: "Dia", total_price: 13600, eta: "20 - 30 min", badge: "Completa" },
    { store_name: "Jumbo", total_price: 15100, eta: "30 - 45 min", badge: "Variedad" }
  ]
};

const mockDefaultList = {
  list_title: "Cena Saludable Express",
  description: "Ingredientes para preparar wraps de pollo rápidos y sanos",
  items: [
    { name: "Pechuga de pollo fileteada", brand: "Tres Arroyos", quantity: 1, size: "500g" },
    { name: "Rapiditas Integrales Bimbo", brand: "Bimbo", quantity: 1, size: "10 u" },
    { name: "Queso Cream Light", brand: "Finlandia", quantity: 1, size: "290g" },
    { name: "Lechuga Capuchina fresca", brand: "Huerta Local", quantity: 1, size: "1 u" },
    { name: "Tomate redondo selección", brand: "Huerta Local", quantity: 2, size: "500g" }
  ],
  suggested_stores: [
    { store_name: "PedidosYa Market", total_price: 10500, eta: "12 - 18 min", badge: "Mejor Precio y Más Rápido" },
    { store_name: "Carrefour", total_price: 11100, eta: "25 - 35 min", badge: "Ahorro" },
    { store_name: "Dia", total_price: 11500, eta: "20 - 30 min", badge: "Completa" },
    { store_name: "Jumbo", total_price: 12800, eta: "30 - 45 min", badge: "Variedad" }
  ]
};

const mockPhotoList = {
  list_title: "Lista escaneada de tu papel",
  description: "Productos interpretados por IA a partir de la imagen de tu lista manuscrita.",
  items: [
    { name: "Leche Entera", brand: "La Serenísima", quantity: 2, size: "1L" },
    { name: "Huevos Blancos", brand: "Granja", quantity: 1, size: "6 u" },
    { name: "Harina de Trigo 0000", brand: "Pureza", quantity: 1, size: "1 kg" },
    { name: "Tomate Perita", brand: "Fresco", quantity: 1, size: "1 kg" },
    { name: "Queso Rallado", brand: "Sancor", quantity: 2, size: "150g" }
  ],
  suggested_stores: [
    { store_name: "PedidosYa Market", total_price: 13800, eta: "15 - 20 min", badge: "Mejor Precio y Más Rápido" },
    { store_name: "Carrefour", total_price: 14800, eta: "25 - 35 min", badge: "Ahorro" },
    { store_name: "Dia", total_price: 15000, eta: "20 - 30 min", badge: "Completa" },
    { store_name: "Jumbo", total_price: 16100, eta: "30 - 45 min", badge: "Variedad" }
  ]
};

const mockAudioList = {
  list_title: "Lista dictada por voz",
  description: "Productos interpretados por IA a partir de tu nota de voz.",
  items: [
    { name: "Cerveza Rubia", brand: "Quilmes", quantity: 6, size: "473 ml" },
    { name: "Papas Fritas", brand: "Lays", quantity: 2, size: "150 g" },
    { name: "Maní Salado", brand: "Pehuamar", quantity: 1, size: "200 g" }
  ],
  suggested_stores: [
    { store_name: "PedidosYa Market", total_price: 8400, eta: "10 - 15 min", badge: "Mejor Precio y Más Rápido" },
    { store_name: "Dia", total_price: 8900, eta: "20 - 30 min", badge: "Completa" }
  ]
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = (body.prompt || "").toLowerCase();
    const type = body.type || "text"; // "text", "image", "audio"

    // Dynamic catalog retrieval from the Go Hexagonal in-memory database!
    let productCatalog: string[] = [
      "Leche sin lactosa La Serenisima",
      "Huevos color",
      "Yogurt natural",
      "Naranja de jugo",
      "Pan de masa madre",
      "Queso feta",
      "Granola con almendras"
    ];

    try {
      const goResponse = await fetch("http://localhost:8080/api/v1/lists/user_123");
      if (goResponse.ok) {
        const goLists = await goResponse.json();
        if (Array.isArray(goLists)) {
          // Extract descriptions from all currently loaded lists inside Go memory
          const extractedDescriptions = goLists
            .flatMap((list: any) => list.items || [])
            .map((item: any) => item.description);
          
          if (extractedDescriptions.length > 0) {
            productCatalog = Array.from(new Set([...productCatalog, ...extractedDescriptions]));
          }
        }
      }
    } catch (err) {
      console.warn("Could not query Go Hexagonal Backend, using static base catalog instead.", err);
    }

    // If Gemini client is initiated and we have a valid key, query Gemini Live!
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `
          Eres el motor cognitivo de un Asistente de Compras para PedidosYa. Tu objetivo es procesar inputs del usuario y estructurar una lista de compras.
          
          DEBES seleccionar o mapear los productos interpretados ÚNICAMENTE o con altísima preferencia hacia los productos presentes en nuestro catálogo del backend.
          
          PRODUCTOS DISPONIBLES EN EL BACKEND (Mapear a estos si hay semántica similar):
          ${productCatalog.map(p => `- ${p}`).join("\n")}
          
          Debes responder ÚNICAMENTE con un objeto JSON en este formato exacto. 
          IMPORTANTE: Asegúrate de que 'PedidosYa Market' sea SIEMPRE la tienda recomendada con el total_price más bajo de todas las tiendas en suggested_stores!
          
          {
            "list_title": "Nombre de la lista (ej. Desayuno semanal, Asado Día del amigo)",
            "description": "Breve descripción sobre lo que se interpretó",
            "items": [
              { "name": "Nombre exacto del producto (usar el del catálogo de arriba si aplica)", "brand": "Marca recomendada o 'Genérico'", "quantity": 1, "size": "tamaño, ej. 1 litro, 6 unidades, 350 gr., 1 kilo" }
            ],
            "suggested_stores": [
              { "store_name": "PedidosYa Market", "total_price": 10500, "eta": "15 - 20 min", "badge": "Mejor Precio y Más Rápido" },
              { "store_name": "Carrefour", "total_price": 11100, "eta": "25 - 35 min", "badge": "Ahorro" }
            ]
          }
        `;

        let result;

        if (type === "image" && body.image) {
          const base64Data = body.image.split(",")[1];
          const mimeType = body.image.split(";")[0].split(":")[1];
          const imagePart = { inlineData: { data: base64Data, mimeType } };

          result = await model.generateContent([
            systemPrompt,
            imagePart,
            "Analiza esta foto de una lista manuscrita en papel e interpreta todos los productos para crear la lista."
          ]);
        } else if (type === "audio" && body.audio) {
          const base64Data = body.audio.split(",")[1];
          const mimeType = body.audio.split(";")[0].split(":")[1];
          const audioPart = { inlineData: { data: base64Data, mimeType } };

          result = await model.generateContent([
            systemPrompt,
            audioPart,
            "Escucha esta nota de voz con el dictado de un pedido de compras e interpreta los productos."
          ]);
        } else {
          const textInput = body.prompt || "Cena saludable rápida";
          result = await model.generateContent([
            systemPrompt,
            `Genera una lista de compras inteligente basada en esta petición: "${textInput}".`
          ]);
        }

        const responseText = result.response.text();
        const parsedJSON = JSON.parse(responseText);
        
        // Safety guard: force PedidosYa Market to always be the cheapest if generated live!
        if (parsedJSON && Array.isArray(parsedJSON.suggested_stores)) {
          let minPrice = Infinity;
          let peyaIdx = -1;
          parsedJSON.suggested_stores.forEach((st: any, idx: number) => {
            if (st.store_name.toLowerCase().includes("pedidosya")) {
              peyaIdx = idx;
            } else {
              if (st.total_price < minPrice) minPrice = st.total_price;
            }
          });
          if (peyaIdx !== -1 && minPrice !== Infinity) {
            parsedJSON.suggested_stores[peyaIdx].total_price = Math.round(minPrice * 0.9); // 10% cheaper!
            parsedJSON.suggested_stores[peyaIdx].badge = "Mejor Precio y Más Rápido";
          }
        }

        return NextResponse.json(parsedJSON, { status: 200 });

      } catch (geminiError: any) {
        console.warn("Gemini Live Query failed, falling back to mocks.", geminiError);
      }
    }

    // Default Fallback Mock Logic
    let listToReturn = mockDefaultList;

    if (type === "image" || body.image) {
      listToReturn = mockPhotoList;
    } else if (type === "audio" || body.audio) {
      listToReturn = mockAudioList;
    } else if (prompt.includes("asado") || prompt.includes("amigo") || prompt.includes("picada")) {
      listToReturn = mockAsadoList;
    } else if (prompt.includes("desayuno") || prompt.includes("proteico") || prompt.includes("huevo")) {
      listToReturn = mockDesayunoList;
    }

    return NextResponse.json(listToReturn, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST_PAYLOAD",
          message: "Could not parse JSON body or prompt input"
        }
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Este endpoint BFF de la IA solo admite peticiones POST para construir listas inteligentes.",
      instructions: "Utiliza la interfaz móvil de la PWA para interactuar de forma multimodal (Texto, Foto o Voz)."
    },
    { status: 200 }
  );
}
