package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backend/internal/adapters/right/memdb"
	"backend/internal/services"
)

func TestServerScaffolding(t *testing.T) {
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
		body := strings.TrimSpace(rr.Body.String())
		if body != expected {
			t.Errorf("handler returned unexpected body: got %v want %v", body, expected)
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

func TestServerEndpoints(t *testing.T) {
	repo := memdb.New()
	svc := services.NewListService(repo)
	server := NewHTTPServer(svc)

	var listID string
	ownerID := "user_123"
	strangerID := "user_789"

	t.Run("CreateList_ValidationError", func(t *testing.T) {
		payload := []byte(`{"title":"","ownerId":""}`)
		req, err := http.NewRequest(http.MethodPost, "/api/v1/lists", bytes.NewBuffer(payload))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rr.Code)
		}

		var errorResp errorEnvelope
		if err := json.Unmarshal(rr.Body.Bytes(), &errorResp); err != nil {
			t.Fatal(err)
		}

		if errorResp.Error.Code != "INVALID_REQUEST_PAYLOAD" {
			t.Errorf("expected error code INVALID_REQUEST_PAYLOAD, got %s", errorResp.Error.Code)
		}
		if !strings.Contains(errorResp.Error.Message, "title") {
			t.Errorf("expected error message to mention 'title', got %s", errorResp.Error.Message)
		}
	})

	t.Run("CreateList_Success", func(t *testing.T) {
		payload := []byte(`{
			"title": "Weekly Grocery",
			"ownerId": "user_123",
			"listType": "PRIVATE",
			"isSharable": false,
			"vendorAssociated": "Supermarket"
		}`)
		req, err := http.NewRequest(http.MethodPost, "/api/v1/lists", bytes.NewBuffer(payload))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rr.Code)
		}

		var respMap map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &respMap); err != nil {
			t.Fatal(err)
		}

		if respMap["id"] == nil || respMap["id"] == "" {
			t.Errorf("expected auto-generated list ID, got nil/empty")
		}
		listID = respMap["id"].(string)

		if respMap["title"] != "Weekly Grocery" {
			t.Errorf("expected title 'Weekly Grocery', got %v", respMap["title"])
		}
		if respMap["ownerId"] != "user_123" {
			t.Errorf("expected ownerId 'user_123', got %v", respMap["ownerId"])
		}
	})

	t.Run("GetListsByUser", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lists/"+ownerID, nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rr.Code)
		}

		var lists []map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &lists); err != nil {
			t.Fatal(err)
		}

		if len(lists) != 1 {
			t.Errorf("expected 1 list, got %d", len(lists))
		}
		if lists[0]["id"] != listID {
			t.Errorf("expected list ID %s, got %v", listID, lists[0]["id"])
		}
	})

	t.Run("GetListByID_ForbiddenForStranger", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lists/"+listID+"/"+strangerID, nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("expected 403 Forbidden, got %d", rr.Code)
		}

		var errorResp errorEnvelope
		if err := json.Unmarshal(rr.Body.Bytes(), &errorResp); err != nil {
			t.Fatal(err)
		}

		if errorResp.Error.Code != "ACCESS_DENIED" {
			t.Errorf("expected ACCESS_DENIED code, got %s", errorResp.Error.Code)
		}
	})

	t.Run("GetListByID_AllowedForOwner", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lists/"+listID+"/"+ownerID, nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rr.Code)
		}

		var list map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &list); err != nil {
			t.Fatal(err)
		}

		if list["id"] != listID {
			t.Errorf("expected list ID %s, got %v", listID, list["id"])
		}
	})

	t.Run("AddItemToList_Validation", func(t *testing.T) {
		payload := []byte(`{"sku":"","quantity":0}`)
		req, err := http.NewRequest(http.MethodPost, "/api/v1/lists/"+listID+"/items", bytes.NewBuffer(payload))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rr.Code)
		}

		var errorResp errorEnvelope
		if err := json.Unmarshal(rr.Body.Bytes(), &errorResp); err != nil {
			t.Fatal(err)
		}

		if errorResp.Error.Code != "INVALID_REQUEST_PAYLOAD" {
			t.Errorf("expected INVALID_REQUEST_PAYLOAD, got %s", errorResp.Error.Code)
		}
	})

	t.Run("AddItemToList_Success", func(t *testing.T) {
		payload := []byte(`{
			"sku": "SKU-1001",
			"description": "Apples",
			"quantity": 5,
			"addedByUserId": "user_456"
		}`)
		req, err := http.NewRequest(http.MethodPost, "/api/v1/lists/"+listID+"/items", bytes.NewBuffer(payload))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rr.Code)
		}

		var item map[string]interface{}
		if err := json.Unmarshal(rr.Body.Bytes(), &item); err != nil {
			t.Fatal(err)
		}

		if item["sku"] != "SKU-1001" {
			t.Errorf("expected SKU-1001, got %v", item["sku"])
		}
		if item["quantity"] != float64(5) {
			t.Errorf("expected quantity 5, got %v", item["quantity"])
		}
		if item["addedByUserId"] != "user_456" {
			t.Errorf("expected addedByUserId user_456, got %v", item["addedByUserId"])
		}
	})

	t.Run("ToggleItem_DeletesIfPresent", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPatch, "/api/v1/lists/"+listID+"/items/SKU-1001/toggle", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rr.Code)
		}

		// Verify list has no items now
		getReq, _ := http.NewRequest(http.MethodGet, "/api/v1/lists/"+listID+"/"+ownerID, nil)
		getRR := httptest.NewRecorder()
		server.Router.ServeHTTP(getRR, getReq)

		var list map[string]interface{}
		_ = json.Unmarshal(getRR.Body.Bytes(), &list)
		items := list["items"].([]interface{})
		if len(items) != 0 {
			t.Errorf("expected 0 items in list, got %d", len(items))
		}
	})

	t.Run("ToggleItem_RestoresIfDeleted", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPatch, "/api/v1/lists/"+listID+"/items/SKU-1001/toggle", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rr.Code)
		}

		// Verify list has Apple item back
		getReq, _ := http.NewRequest(http.MethodGet, "/api/v1/lists/"+listID+"/"+ownerID, nil)
		getRR := httptest.NewRecorder()
		server.Router.ServeHTTP(getRR, getReq)

		var list map[string]interface{}
		_ = json.Unmarshal(getRR.Body.Bytes(), &list)
		items := list["items"].([]interface{})
		if len(items) != 1 {
			t.Errorf("expected 1 item in list, got %d", len(items))
		}

		it := items[0].(map[string]interface{})
		if it["sku"] != "SKU-1001" {
			t.Errorf("expected SKU-1001 restored, got %v", it["sku"])
		}
	})

	t.Run("DeleteItem", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodDelete, "/api/v1/lists/"+listID+"/items/SKU-1001", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rr.Code)
		}

		// Verify list is empty
		getReq, _ := http.NewRequest(http.MethodGet, "/api/v1/lists/"+listID+"/"+ownerID, nil)
		getRR := httptest.NewRecorder()
		server.Router.ServeHTTP(getRR, getReq)

		var list map[string]interface{}
		_ = json.Unmarshal(getRR.Body.Bytes(), &list)
		items := list["items"].([]interface{})
		if len(items) != 0 {
			t.Errorf("expected 0 items in list, got %d", len(items))
		}
	})

	t.Run("DeleteList", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodDelete, "/api/v1/lists/"+listID, nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		server.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rr.Code)
		}

		// Verify retrieval returns 404
		getReq, _ := http.NewRequest(http.MethodGet, "/api/v1/lists/"+listID+"/"+ownerID, nil)
		getRR := httptest.NewRecorder()
		server.Router.ServeHTTP(getRR, getReq)

		if getRR.Code != http.StatusNotFound {
			t.Errorf("expected 404 Not Found for deleted list, got %d", getRR.Code)
		}
	})
}
