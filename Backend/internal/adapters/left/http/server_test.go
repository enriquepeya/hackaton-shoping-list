package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/adapters/right/memdb"
	"backend/internal/services"
)

func TestServerScaffolding(t *testing.T) {
	// Initialize real dependencies for testing
	repo := memdb.New()
	svc := services.NewListService(repo)
	server := NewHTTPServer(svc)

	t.Run("HealthCheck", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/health", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		expected := `{"status":"ok"}`
		if rr.Body.String() != expected {
			t.Errorf("handler returned unexpected body: got %v want %v", rr.Body.String(), expected)
		}
	})

	t.Run("CORS", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodOptions, "/health", nil)
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Origin", "http://localhost:3000")
		req.Header.Set("Access-Control-Request-Method", "GET")

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		allowOrigin := rr.Header().Get("Access-Control-Allow-Origin")
		if allowOrigin != "http://localhost:3000" {
			t.Errorf("CORS header incorrect: got %q, want %q", allowOrigin, "http://localhost:3000")
		}
	})
}
