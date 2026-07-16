package http

import (
	"net/http"
	"backend/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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

	r.Get("/health", s.handleHealthCheck)

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

// handleHealthCheck returns a simple 200 OK status to indicate the service is running.
func (s *HTTPServer) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
