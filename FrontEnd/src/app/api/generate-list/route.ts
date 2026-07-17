import { NextResponse } from "next/server";

// Fallback lists for offline / hackathon demo mode
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
    { store_name: "PedidosYa Market", total_price: 24500, eta: "15 - 20 min", badge: "Más rápido" },
    { store_name: "Carrefour", total_price: 22800, eta: "25 - 35 min", badge: "Mejor precio" },
    { store_name: "Dia", total_price: 23100, eta: "20 - 30 min", badge: "Completa" },
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
    { store_name: "PedidosYa Market", total_price: 14500, eta: "15 - 20 min", badge: "Más rápido" },
    { store_name: "Carrefour", total_price: 13200, eta: "25 - 35 min", badge: "Mejor precio" },
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
    { name: "Queso Crema Light", brand: "Finlandia", quantity: 1, size: "290g" },
    { name: "Lechuga Capuchina fresca", brand: "Huerta Local", quantity: 1, size: "1 u" },
    { name: "Tomate redondo selección", brand: "Huerta Local", quantity: 2, size: "500g" }
  ],
  suggested_stores: [
    { store_name: "PedidosYa Market", total_price: 12200, eta: "12 - 18 min", badge: "Más rápido" },
    { store_name: "Carrefour", total_price: 11100, eta: "25 - 35 min", badge: "Mejor precio" },
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
    { store_name: "PedidosYa Market", total_price: 15400, eta: "15 - 20 min", badge: "Más rápido" },
    { store_name: "Carrefour", total_price: 14800, eta: "25 - 35 min", badge: "Mejor precio" },
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
    { store_name: "PedidosYa Market", total_price: 9500, eta: "10 - 15 min", badge: "Más rápido" },
    { store_name: "Dia", total_price: 8900, eta: "20 - 30 min", badge: "Mejor precio" }
  ]
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = (body.prompt || "").toLowerCase();
    const type = body.type || "text"; // "text", "image", "audio"

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
