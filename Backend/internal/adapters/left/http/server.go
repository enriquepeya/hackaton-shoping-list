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
	Error errorDetails `json:"error"`
}

type errorDetails struct {
	Code    string `json:"code"`
	Message string `json:"message"`
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

// handleHealthCheck returns a simple 200 OK status to indicate the service is running.
func (s *HTTPServer) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type createListRequest struct {
	Title            string  `json:"title"`
	VendorAssociated *string `json:"vendorAssociated"`
	OwnerID          string  `json:"ownerId"`
	ListType         string  `json:"listType"`
	IsSharable       bool    `json:"isSharable"`
	Image            string  `json:"image"`
}

func (s *HTTPServer) handleCreateList(w http.ResponseWriter, r *http.Request) {
	var req createListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", "invalid request body")
		return
	}

	list := &domain.List{
		Title:            req.Title,
		VendorAssociated: req.VendorAssociated,
		OwnerID:          req.OwnerID,
		ListType:         req.ListType,
		IsSharable:       req.IsSharable,
		Image:            req.Image,
	}

	if err := s.service.CreateList(list); err != nil {
		// Business validations return BAD_REQUEST
		respondWithError(w, http.StatusBadRequest, "INVALID_REQUEST_PAYLOAD", err.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, list)
}

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
	SKU           string  `json:"sku"`
	EAN           *string `json:"ean"`
	Description   string  `json:"description"`
	Quantity      int     `json:"quantity"`
	AddedByUserID string  `json:"addedByUserId"`
}

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

func (s *HTTPServer) handleDeleteList(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := s.service.DeleteList(id); err != nil {
		respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "list deleted successfully"})
}

func (s *HTTPServer) handleDeleteItem(w http.ResponseWriter, r *http.Request) {
	listID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	if err := s.service.DeleteItem(listID, itemID); err != nil {
		respondWithError(w, http.StatusNotFound, "LIST_NOT_FOUND", err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "item deleted successfully"})
}
