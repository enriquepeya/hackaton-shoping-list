package http

import (
	"encoding/json"
	"net/http"
	"strings"
	"backend/internal/domain"
	"backend/internal/services"
	_ "backend/docs"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger"
)

// HTTPServer represents our HTTP inbound adapter.
type HTTPServer struct {
	Router  *chi.Mux
	service *services.ListService
}

// NewHTTPServer constructs and initializes a new HTTPServer with required middlewares and routes.
func NewHTTPServer(service *services.ListService) *HTTPServer {
	r := chi.NewRouter()

	// Register standard middlewares
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	s := &HTTPServer{
		Router:  r,
		service: service,
	}

	// Register Routes
	r.Get("/health", s.handleHealthCheck)

	r.Get("/swagger/*", httpSwagger.WrapHandler)

	r.Post("/api/v1/lists", s.handleCreateList)
	r.Get("/api/v1/lists/{userId}", s.handleGetListsByUser)
	r.Get("/api/v1/lists/{id}/{userId}", s.handleGetListByID)
	r.Post("/api/v1/lists/{id}/items", s.handleAddItemToList)
	r.Patch("/api/v1/lists/{id}/items/{itemId}/toggle", s.handleToggleItem)
	r.Delete("/api/v1/lists/{id}", s.handleDeleteList)
	r.Delete("/api/v1/lists/{id}/items/{itemId}", s.handleDeleteItem)

	return s
}

// corsMiddleware sets standard CORS headers for local frontend development (supporting http://localhost:3000)
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// errorEnvelope and support types define the standard API error payload matching product guidelines.
type errorEnvelope struct {
	// The core error details wrapper
	Error errorDetails `json:"error"`
}

type errorDetails struct {
	// Programmatic error code for client error handling
	Code    string `json:"code" example:"INVALID_REQUEST_PAYLOAD"`
	// Human-readable message explaining the failure details
	Message string `json:"message" example:"invalid request body"`
}

func respondWithError(w http.ResponseWriter, statusCode int, errorCode string, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(errorEnvelope{
		Error: errorDetails{
			Code:    errorCode,
			Message: msg,
		},
	})
}

func respondWithJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}

// handleHealthCheck godoc
// @Summary Health check
// @Description check server status
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func (s *HTTPServer) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type createListRequest struct {
	// The title of the collaborative list
	Title            string  `json:"title" example:"Weekly Groceries"`
	// Optional associated vendor
	VendorAssociated *string `json:"vendorAssociated" example:"Supermarket"`
	// The owner's user ID
	OwnerID          string  `json:"ownerId" example:"user-123"`
	// The accessibility type of the list (PRIVATE or PUBLIC)
	ListType         string  `json:"listType" example:"PRIVATE"`
	// Flag indicating if other users can join this list
	IsSharable       bool    `json:"isSharable" example:"true"`
	// Optional image URL for the list
	Image            string  `json:"image" example:"https://example.com/images/list.jpg"`
	// Initial list of items mandatory during list creation
	Items            []addItemRequest `json:"items"`
}

// handleCreateList godoc
// @Summary Create a shopping/order list
// @Description Create a new shared or private shopping list.
// @Tags lists
// @Accept json
// @Produce json
// @Param body body createListRequest true "List creation payload"
// @Success 201 {object} domain.List
// @Failure 400 {object} errorEnvelope
// @Router /api/v1/lists [post]
func (s *HTTPServer) handleCreateList(w http.ResponseWriter, r *http.Request) {
	var req createListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", "invalid request body")
		return
	}

	items := make([]domain.Item, len(req.Items))
	for i, it := range req.Items {
		items[i] = domain.Item{
			SKU:           it.SKU,
			EAN:           it.EAN,
			Description:   it.Description,
			Quantity:      it.Quantity,
			AddedByUserID: it.AddedByUserID,
		}
	}

	list := &domain.List{
		Title:            req.Title,
		VendorAssociated: req.VendorAssociated,
		OwnerID:          req.OwnerID,
		ListType:         req.ListType,
		IsSharable:       req.IsSharable,
		Image:            req.Image,
		Items:            items,
	}

	if err := s.service.CreateList(list); err != nil {
		// Business validations return BAD_REQUEST
		respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", err.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, list)
}

// handleGetListsByUser godoc
// @Summary Get lists for user
// @Description Retrieves all lists where the specified user is the owner, or lists that are PUBLIC/sharable.
// @Tags lists
// @Produce json
// @Param userId path string true "User ID"
// @Success 200 {array} domain.List
// @Failure 400 {object} errorEnvelope
// @Router /api/v1/lists/{userId} [get]
func (s *HTTPServer) handleGetListsByUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	if userID == "" {
		respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", "user ID is required")
		return
	}

	lists, err := s.service.GetAllLists()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		return
	}

	// Filter lists: user must be owner OR list must be PUBLIC OR isSharable must be true
	filtered := make([]*domain.List, 0)
	for _, l := range lists {
		if l.OwnerID == userID || strings.ToUpper(l.ListType) == "PUBLIC" || l.IsSharable {
			filtered = append(filtered, l)
		}
	}

	respondWithJSON(w, http.StatusOK, filtered)
}

// handleGetListByID godoc
// @Summary Get list by ID
// @Description Retrieves list metadata and all items by list ID, checking privacy permissions.
// @Tags lists
// @Produce json
// @Param id path string true "List ID"
// @Param userId path string true "User ID trying to access"
// @Success 200 {object} domain.List
// @Failure 404 {object} errorEnvelope
// @Failure 403 {object} errorEnvelope
// @Router /api/v1/lists/{id}/{userId} [get]
func (s *HTTPServer) handleGetListByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userId")

	list, err := s.service.GetListByID(id)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		return
	}

	// Verify accessibility
	if strings.ToUpper(list.ListType) == "PRIVATE" && list.OwnerID != userID && !list.IsSharable {
		respondWithError(w, http.StatusForbidden, "ACCESS_DENIED", "you do not have access to this list")
		return
	}

	respondWithJSON(w, http.StatusOK, list)
}

type addItemRequest struct {
	// The Stock Keeping Unit of the item
	SKU           string  `json:"sku" example:"SKU-1001"`
	// The European Article Number barcode
	EAN           *string `json:"ean" example:"1234567890123"`
	// The descriptive name of the item
	Description   string  `json:"description" example:"Whole Milk 1L"`
	// The quantity of the item
	Quantity      int     `json:"quantity" example:"2"`
	// The user ID who added this item
	AddedByUserID string  `json:"addedByUserId" example:"user-123"`
}

// handleAddItemToList godoc
// @Summary Add item to list
// @Description Appends a new item with description and positive quantity to an existing list.
// @Tags items
// @Accept json
// @Produce json
// @Param id path string true "List ID"
// @Param body body addItemRequest true "Item fields payload"
// @Success 201 {object} domain.Item
// @Failure 400 {object} errorEnvelope
// @Failure 404 {object} errorEnvelope
// @Router /api/v1/lists/{id}/items [post]
func (s *HTTPServer) handleAddItemToList(w http.ResponseWriter, r *http.Request) {
	listID := chi.URLParam(r, "id")

	var req addItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", "invalid request body")
		return
	}

	item := &domain.Item{
		SKU:           req.SKU,
		EAN:           req.EAN,
		ListID:        listID,
		Description:   req.Description,
		Quantity:      req.Quantity,
		AddedByUserID: req.AddedByUserID,
	}

	if err := s.service.AddItemToList(listID, item); err != nil {
		// Differentiate between list not found and invalid item payload
		if strings.Contains(err.Error(), "not found") {
			respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		} else {
			respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", err.Error())
		}
		return
	}

	respondWithJSON(w, http.StatusCreated, item)
}

// handleToggleItem godoc
// @Summary Toggle item inclusion
// @Description Soft-deletes/removes an item from list if present, or restores it if it was previously soft-deleted.
// @Tags items
// @Produce json
// @Param id path string true "List ID"
// @Param itemId path string true "Item SKU ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} errorEnvelope
// @Failure 404 {object} errorEnvelope
// @Router /api/v1/lists/{id}/items/{itemId}/toggle [patch]
func (s *HTTPServer) handleToggleItem(w http.ResponseWriter, r *http.Request) {
	listID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	if err := s.service.ToggleItem(listID, itemID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		} else {
			respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", err.Error())
		}
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "item toggled successfully"})
}

// handleDeleteList godoc
// @Summary Delete list
// @Tags lists
// @Produce json
// @Param id path string true "List ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} errorEnvelope
// @Router /api/v1/lists/{id} [delete]
func (s *HTTPServer) handleDeleteList(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := s.service.DeleteList(id); err != nil {
		respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "list deleted successfully"})
}

// handleDeleteItem godoc
// @Summary Delete item
// @Tags items
// @Produce json
// @Param id path string true "List ID"
// @Param itemId path string true "Item SKU ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} errorEnvelope
// @Router /api/v1/lists/{id}/items/{itemId} [delete]
func (s *HTTPServer) handleDeleteItem(w http.ResponseWriter, r *http.Request) {
	listID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	if err := s.service.DeleteItem(listID, itemID); err != nil {
		respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "item deleted successfully"})
}
