Aquí tienes la versión actualizada del **`agent.md`** y las **especificaciones técnicas (Specs)**, optimizadas para un entorno web moderno con **React (Next.js)** y pensadas para que, con tu perfil backend, la integración de la IA sea lo más directa posible.

### 📄 Archivo: `agent.md` (System Prompt del Agente de IA para Backend Node.js)

Este archivo debe usarse como el prompt del sistema (*System Prompt*) cuando inicialices la llamada a la API de tu LLM (por ejemplo, OpenAI o Claude) desde tu ruta de Next.js (`/api/generate-list`).

```markdown
# Agente de Compras Inteligente - System Prompt

## Rol y Objetivo
Eres el motor cognitivo de un Asistente de Compras integrado en una PWA (Aplicación Web Progresiva) de delivery. Tu objetivo es procesar el input en lenguaje natural del usuario (ej. "Quiero hacer comida para toda la semana" o "Asado Día del amigo") y devolver una estructura de datos lista para ser renderizada en el Front-End (React).

## Capacidades y Flujo de Trabajo
1. **Comprensión de Lenguaje Natural (NLU):** 
   - Procesa inputs abiertos y extrae los productos implícitos.
   - Si el usuario pide un "Desayuno proteico", debes inferir e incluir automáticamente: agua mineral, leche deslactosada, pan lactal, huevos y yogurt natural.

2. **Generación de Listas Automáticas:**
   - Genera un título descriptivo y conciso para la lista (ej. "Noche de picadas", "Desayuno semanal").
   - Pobla la lista con productos reales, especificando marca, tamaño y formato (ej. "Leche sin lactosa La Serenisima 1 litro", "Ojo de bife 150gr", "Papas Fritas Lays Clásicas 150 g").

3. **Optimización y Promociones:**
   - Identifica oportunidades de ahorro y aplícalas al JSON. Ejemplos de promociones vigentes: "3x4 en snacks y bebidas", "20% OFF", "10% OFF".

4. **Comparativa de Tiendas (Smart Routing):**
   - Evalúa la lista generada contra las tiendas disponibles: Carrefour, Jumbo, PedidosYa Market y Dia.
   - Asigna etiquetas dinámicas a las tiendas sugeridas, como "Completa" (tiene todos los productos) o "Mejor precio".
   - Calcula el tiempo estimado de entrega (ej. "15 - 20 min" o "20 - 40 min").

## Formato de Salida Restringido (JSON)
Devuelve ÚNICAMENTE un objeto JSON válido. Este objeto será consumido directamente por el estado de React. No incluyas texto fuera del JSON.
{
  "list_title": "Nombre inferido (ej. Asado Día del amigo)",
  "description": "Breve resumen de los ítems principales",
  "items": [
    { "name": "Nombre del producto", "brand": "Marca", "quantity": 1, "size": "150gr" }
  ],
  "suggested_stores": [
    { 
      "store_name": "Carrefour", 
      "total_price": 160000, 
      "eta": "15 - 20 min", 
      "badge": "Mejor precio" 
    }
  ]
}
```

---

### 💻 Especificaciones de Desarrollo Front-End (React.js / Next.js)

Dado que la prioridad es la velocidad y mantener la fidelidad visual del diseño móvil en un entorno web, estas son las directrices para el Front-End.

#### 1. Arquitectura y Tecnologías
*   **Framework:** **Next.js** (App Router recomendado). Te permitirá tener las vistas de React y tu backend (API routes) en un solo repositorio.
*   **Estilos:** **Tailwind CSS**. Es la forma más rápida de replicar el diseño. 
*   **Estructura "Mobile-First" (Crucial para la demo web):** El `<body>` debe tener un fondo gris claro o neutro, y toda la aplicación debe estar envuelta en un contenedor centrado que simule la pantalla del teléfono: `<main className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative overflow-hidden">`.
*   **Manejo de Estado:** Context API nativo de React o **Zustand** (recomendado por ser ultraligero) para guardar los ítems del carrito y los datos devueltos por la IA.

#### 2. Vistas y Componentes a Desarrollar (Replicando el PDF)

**A. Buscador Cognitivo ("¿Qué necesitás hoy?")**
*   **Input Area:** Un campo de texto grande enfocado en el prompt del usuario.
*   **Chips (Botones de sugerencias):** Debajo del input, renderizar botones horizontales con opciones rápidas como "Para toda la semana 20 productos", "Desayuno 3 productos", "Wrap de Pollo 1 productos".

**B. Gestor y Vista de Listas ("Mis listas")**
*   **Tarjetas de Listas:** Componentes iterables que muestren el título de las listas guardadas (ej. "Desayuno semanal", "Asado Día del amigo") y la cantidad de productos.
*   **Detalle de Lista:** Tarjetas de productos que muestren la imagen, nombre, precio, y **sellos nutricionales** (octógonos negros como "Exceso en grasas totales", "Exceso en sodio" presentes en Lays, Takis y Doritos).

**C. Comparador de Locales ("Elegí el local más conveniente")**
*   **Selector Horizontal (Tabs):** Tarjetas clickeables con el logo de **Carrefour, Jumbo, PedidosYa Market y Dia**.
*   **Información Requerida por Tab:** Debe mostrar el tiempo de entrega ("15 - 20 min"), el costo total ("$ 160.000") y *badges* visuales como "Completa" o "Mejor precio".

**D. Flujo de Carrito y Checkout**
*   **Resumen ("Tu carrito"):** Lista final con opción de eliminar/editar. Mostrar costo de envío ("Envío $2.000") y una sección destacada para **"Aprovechá estas promos"** (ej. módulo de "3x4 en snacks y bebidas").
*   **Pago y Rider:** 
    *   Tarjetas guardadas (Santander Crédito, Banco Galicia Crédito).
    *   Botonera para propina del rider ("El 100% irá directo a su bolsillo"): **"Ahora no", "$ 700", "$ 1.000", "$ 1.500", "$ 2.000"**.
*   **Datos de Entrega:** Dirección y un toggle o checkbox para **"Envío prioritario + $ 750"** y un campo para instrucciones ("Dejar en la puerta").

**E. Pantalla de Éxito**
*   **Confirmación:** Título "¡Gracias por tu pedido!".
*   **Feedback de IA:** Un banner indicando la lista generada (ej. "Noche de picadas - 8 productos") con un botón de acción primaria para **"Guardar lista"**.
*   **Redirección:** Un temporizador ("Te redirigiremos automáticamente en 8 segundos") y un botón para "Ir a Seguimiento de mi orden".
