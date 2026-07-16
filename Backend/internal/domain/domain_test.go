package domain_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"backend/internal/domain"
)

func TestDomainModels(t *testing.T) {
	// 1. Test User model instantiation and JSON serialization
	now := time.Now()
	user := domain.User{
		UserID:   "user_123",
		Role:     "ADMIN",
		JoinedAt: now,
	}

	userBytes, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("failed to marshal user: %v", err)
	}

	userStr := string(userBytes)
	if !strings.Contains(userStr, `"userId":`) {
		t.Errorf("expected JSON to contain 'userId', got: %s", userStr)
	}
	if !strings.Contains(userStr, `"role":`) {
		t.Errorf("expected JSON to contain 'role', got: %s", userStr)
	}
	if !strings.Contains(userStr, `"joinedAt":`) {
		t.Errorf("expected JSON to contain 'joinedAt', got: %s", userStr)
	}

	// 2. Test Item model instantiation and JSON serialization
	eanVal := "1234567890123"
	item := domain.Item{
		SKU:         "sku_abc",
		EAN:         &eanVal,
		ListID:      "list_123",
		Description: "Milk",
		Quantity:    2,
	}

	itemBytes, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("failed to marshal item: %v", err)
	}

	itemStr := string(itemBytes)
	if !strings.Contains(itemStr, `"sku":`) {
		t.Errorf("expected JSON to contain 'sku', got: %s", itemStr)
	}
	if !strings.Contains(itemStr, `"ean":`) {
		t.Errorf("expected JSON to contain 'ean', got: %s", itemStr)
	}
	if !strings.Contains(itemStr, `"listId":`) {
		t.Errorf("expected JSON to contain 'listId', got: %s", itemStr)
	}
	if !strings.Contains(itemStr, `"description":`) {
		t.Errorf("expected JSON to contain 'description', got: %s", itemStr)
	}
	if !strings.Contains(itemStr, `"quantity":`) {
		t.Errorf("expected JSON to contain 'quantity', got: %s", itemStr)
	}

	// 3. Test List model instantiation and JSON serialization
	vendorVal := "supermarket_xyz"
	deletedAtVal := now.Add(1 * time.Hour)
	list := domain.List{
		ID:               "list_123",
		Title:            "Weekly Groceries",
		Items:            []domain.Item{item},
		VendorAssociated: &vendorVal,
		OwnerID:          "user_123",
		ListType:         "PUBLIC",
		IsSharable:       true,
		Image:            "http://example.com/image.png",
		CreatedAt:        now,
		UpdatedAt:        now,
		DeletedAt:        &deletedAtVal,
		LastPurchaseDate: now,
		AddedByUserID:    "user_123",
	}

	listBytes, err := json.Marshal(list)
	if err != nil {
		t.Fatalf("failed to marshal list: %v", err)
	}

	listStr := string(listBytes)
	requiredKeys := []string{
		`"id":`, `"title":`, `"items":`, `"vendorAssociated":`,
		`"ownerId":`, `"listType":`, `"isSharable":`, `"image":`,
		`"createdAt":`, `"updatedAt":`, `"deletedAt":`, `"lastPurchaseDate":`,
		`"addedByUserId":`,
	}

	for _, key := range requiredKeys {
		if !strings.Contains(listStr, key) {
			t.Errorf("expected JSON to contain key %s, got: %s", key, listStr)
		}
	}
}
