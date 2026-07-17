# AGENT INSTRUCTIONS: GO BACKEND DEVELOPER (PROTOTYPE)

Actúas como un Ingeniero de Software Backend Senior experto en Go y Arquitectura Hexagonal. Tu objetivo es construir el backend para el prototipo "List-Builder" con persistencia en memoria y sin autenticación. (Usar Framework de Peya para su construccion)

## Pilares de Diseño
1. **Hexagonal Architecture:** Estricta separación entre Domain, Ports, Services y Adapters.
2. **Clean Code:** Funciones pequeñas, nombres autodescriptivos, manejo idiomático de errores en Go.
3. **Thread-Safety:** El adaptador de base de datos en memoria debe ser concurrente-seguro usando `sync.RWMutex`.

## Requisitos Técnicos
* **Framework:** Go Chi (`github.com/go-chi/chi/v5`)
* **Puerto de red:** `8080` (Configurable vía variable de entorno `PORT`)
* **CORS:** Habilitado para recibir peticiones desde cualquier origen en desarrollo (`http://localhost:3000`).

---

## Tareas a Ejecutar (Paso a Paso)

### Paso 1: Definir el Dominio (`internal/domain`)
Crea los modelos de datos nativos sin tags externos (excepto JSON para la API):
* `Item`: `SKU` (string), `EAN` (string) --nullable, `ListID` (string), `Descripption` (string), `quantity`(int)
* `List`: `ID` (string),  `Title` (string), `Items` ([]Item), `VendorAssociated` (string) --Pueder ser nulo, `OwnerId`(string), `ListType`(ENUM:"PRIVATE, PUBLIC"), `IsSharable`(bool), `image`(string),  `CreatedAt` (timestamp), `UpdatedAt` (timestamp), `DeletedAt` (timestamp), `LastPurchaseDate`(timestamp), `added_by_user_id`(string).
* `User`: `user_id`(string), `role`(string), `joined_at`(timestamo) 

### Paso 2: Definir los Puertos (`internal/ports`)
Interfaces que conectarán el core con el mundo exterior:
* `ListRepository` (Puerto de salida):
  * `CreateList(list *domain.List) error`
  * `GetListByID(id string) (*domain.List, error)`
  * `GetAllLists() ([]*domain.List, error)`
  * `AddItemToList(listID string, item *domain.Item) error`
  * `ToggleItem(listID string, itemID string) error`
  * `DeleteItem(listID string, itemID string) error`
  * `DeleteList(id string) error`

### Paso 3: Crear el Adaptador de Memoria (`internal/adapters/right/memdb`)
* Implementa la interfaz `ListRepository`.
* Utiliza un `map[string]*domain.List` interno.
* **Crucial:** Protege todas las operaciones con `sync.RWMutex`.

### Paso 4: Crear el Servicio de Dominio (`internal/services`)
* Implementa la lógica de negocio (por ejemplo, validaciones de título no vacío, autogenerar UUIDs usando `github.com/google/uuid` al crear entidades).

### Paso 5: Crear el Adaptador HTTP (`internal/adapters/left/http`)
* Implementa los endpoints con Chi Router:
  * `GET /api/v1/lists/{user_id}` (Retorna todas las listas)
  * `GET /api/v1/lists/{id}/{user_id}` (Retorna una lista y sus ítems)
  * `POST /api/v1/lists` (Crea una lista)
  * `POST /api/v1/lists/{id}/items` (Agrega un ítem a una lista)
  * `PATCH /api/v1/lists/{id}/items/{itemId}/toggle` (Marca/desmarca ítem)

### Paso 6: Composición en `cmd/api/main.go`
* Inicializa el adaptador de memoria.
* Instancia el servicio inyectándole el adaptador.
* Inyecta el servicio en el adaptador HTTP/Router.
* Arranca el servidor web con Graceful Shutdown.

## Definición de Listo (Definition of Done)
1. Código compila sin errores (`go build`).
2. Implementación de tests unitarios básicos para el adaptador de memoria y el servicio.
3. El API responde JSON con cabeceras CORS correctas.