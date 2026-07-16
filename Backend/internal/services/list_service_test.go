package services

import (
	"backend/internal/adapters/right/memdb"
	"backend/internal/domain"
	"testing"
)

func TestCreateList_Validation(t *testing.T) {
	db := memdb.New()
	svc := NewListService(db)

	// Test empty Title
	list1 := &domain.List{
		OwnerID: "user-1",
	}
	err := svc.CreateList(list1)
	if err == nil {
		t.Error("expected validation error for empty title, got nil")
	}

	// Test empty OwnerID
	list2 := &domain.List{
		Title: "My List",
	}
	err = svc.CreateList(list2)
	if err == nil {
		t.Error("expected validation error for empty owner ID, got nil")
	}
}

func TestCreateList_SuccessAndGeneration(t *testing.T) {
	db := memdb.New()
	svc := NewListService(db)

	list := &domain.List{
		Title:   "Groceries",
		OwnerID: "user-123",
	}

	err := svc.CreateList(list)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if list.ID == "" {
		t.Error("expected auto-generated ID, got empty string")
	}

	if list.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set, got zero time")
	}

	if list.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set, got zero time")
	}

	// Retrieve to make sure it was stored correctly
	stored, err := svc.GetListByID(list.ID)
	if err != nil {
		t.Fatalf("failed to retrieve created list: %v", err)
	}

	if stored.ID != list.ID || stored.Title != "Groceries" || stored.OwnerID != "user-123" {
		t.Errorf("stored list mismatch, got: %+v", stored)
	}
}

func TestAddItemToList_Validation(t *testing.T) {
	db := memdb.New()
	svc := NewListService(db)

	// Setup a list first
	list := &domain.List{
		Title:   "Shopping List",
		OwnerID: "user-1",
	}
	if err := svc.CreateList(list); err != nil {
		t.Fatalf("failed to setup list: %v", err)
	}

	// Test non-positive quantity
	item1 := &domain.Item{
		SKU:         "sku-1",
		Description: "Milk",
		Quantity:    0,
	}
	err := svc.AddItemToList(list.ID, item1)
	if err == nil {
		t.Error("expected validation error for non-positive quantity, got nil")
	}

	// Test empty SKU
	item2 := &domain.Item{
		SKU:         "",
		Description: "Milk",
		Quantity:    1,
	}
	err = svc.AddItemToList(list.ID, item2)
	if err == nil {
		t.Error("expected validation error for empty SKU, got nil")
	}

	// Test empty Description
	item3 := &domain.Item{
		SKU:         "sku-3",
		Description: "",
		Quantity:    1,
	}
	err = svc.AddItemToList(list.ID, item3)
	if err == nil {
		t.Error("expected validation error for empty description, got nil")
	}
}

func TestAddItemToList_Success(t *testing.T) {
	db := memdb.New()
	svc := NewListService(db)

	list := &domain.List{
		Title:   "Shopping List",
		OwnerID: "user-1",
	}
	if err := svc.CreateList(list); err != nil {
		t.Fatalf("failed to setup list: %v", err)
	}

	item := &domain.Item{
		SKU:         "sku-1",
		Description: "Apples",
		Quantity:    5,
	}

	err := svc.AddItemToList(list.ID, item)
	if err != nil {
		t.Fatalf("failed to add item: %v", err)
	}

	// Verify the item is in the list
	stored, err := svc.GetListByID(list.ID)
	if err != nil {
		t.Fatalf("failed to retrieve list: %v", err)
	}

	if len(stored.Items) != 1 {
		t.Fatalf("expected 1 item in list, got %d", len(stored.Items))
	}

	if stored.Items[0].SKU != "sku-1" || stored.Items[0].Description != "Apples" || stored.Items[0].Quantity != 5 {
		t.Errorf("item mismatch, got: %+v", stored.Items[0])
	}
}

func TestProxyMethods(t *testing.T) {
	db := memdb.New()
	svc := NewListService(db)

	list := &domain.List{
		Title:   "Proxy Test",
		OwnerID: "user-2",
	}
	if err := svc.CreateList(list); err != nil {
		t.Fatalf("failed to create list: %v", err)
	}

	// Test GetAllLists
	lists, err := svc.GetAllLists()
	if err != nil {
		t.Fatalf("failed to get all lists: %v", err)
	}
	if len(lists) != 1 {
		t.Errorf("expected 1 list, got %d", len(lists))
	}

	// Test ToggleItem and DeleteItem proxying
	item := &domain.Item{
		SKU:         "sku-toggle",
		Description: "Toggle Item",
		Quantity:    2,
	}
	if err := svc.AddItemToList(list.ID, item); err != nil {
		t.Fatalf("failed to add item: %v", err)
	}

	// Toggle item off (soft delete)
	if err := svc.ToggleItem(list.ID, "sku-toggle"); err != nil {
		t.Fatalf("failed to toggle item: %v", err)
	}

	// Check items list is empty
	stored, _ := svc.GetListByID(list.ID)
	if len(stored.Items) != 0 {
		t.Errorf("expected 0 active items after toggle, got %d", len(stored.Items))
	}

	// Toggle item back on (restore)
	if err := svc.ToggleItem(list.ID, "sku-toggle"); err != nil {
		t.Fatalf("failed to restore item: %v", err)
	}
	stored, _ = svc.GetListByID(list.ID)
	if len(stored.Items) != 1 {
		t.Errorf("expected 1 active item after restore toggle, got %d", len(stored.Items))
	}

	// Delete item
	if err := svc.DeleteItem(list.ID, "sku-toggle"); err != nil {
		t.Fatalf("failed to delete item: %v", err)
	}
	stored, _ = svc.GetListByID(list.ID)
	if len(stored.Items) != 0 {
		t.Errorf("expected 0 items after delete, got %d", len(stored.Items))
	}

	// Delete list
	if err := svc.DeleteList(list.ID); err != nil {
		t.Fatalf("failed to delete list: %v", err)
	}

	// Get list should now fail
	_, err = svc.GetListByID(list.ID)
	if err == nil {
		t.Error("expected list to be deleted, but retrieved successfully")
	}
}
