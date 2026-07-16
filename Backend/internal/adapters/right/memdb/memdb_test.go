package memdb

import (
	"backend/internal/domain"
	"fmt"
	"sync"
	"testing"
)

func TestMemDBCRUD(t *testing.T) {
	db := New()

	// 1. GetListByID - non-existing
	_, err := db.GetListByID("list-1")
	if err == nil {
		t.Error("Expected error getting non-existing list")
	}

	// 2. CreateList
	list := &domain.List{
		ID:         "list-1",
		Title:      "Grocery List",
		OwnerID:    "owner-1",
		IsSharable: true,
		Items:      []domain.Item{},
	}
	err = db.CreateList(list)
	if err != nil {
		t.Fatalf("Failed to create list: %v", err)
	}

	// Attempting to recreate should fail
	err = db.CreateList(list)
	if err == nil {
		t.Error("Expected error when creating a list that already exists")
	}

	// 3. GetListByID - existing
	retrieved, err := db.GetListByID("list-1")
	if err != nil {
		t.Fatalf("Failed to get list: %v", err)
	}
	if retrieved.Title != "Grocery List" {
		t.Errorf("Expected title 'Grocery List', got '%s'", retrieved.Title)
	}

	// 4. GetAllLists
	lists, err := db.GetAllLists()
	if err != nil {
		t.Fatalf("Failed to get all lists: %v", err)
	}
	if len(lists) != 1 {
		t.Errorf("Expected 1 list, got %d", len(lists))
	}

	// 5. AddItemToList
	item := &domain.Item{
		SKU:         "sku-1",
		ListID:      "list-1",
		Description: "Apples",
		Quantity:    5,
	}
	err = db.AddItemToList("list-1", item)
	if err != nil {
		t.Fatalf("Failed to add item to list: %v", err)
	}

	retrieved, _ = db.GetListByID("list-1")
	if len(retrieved.Items) != 1 {
		t.Fatalf("Expected 1 item in list, got %d", len(retrieved.Items))
	}
	if retrieved.Items[0].SKU != "sku-1" {
		t.Errorf("Expected SKU 'sku-1', got '%s'", retrieved.Items[0].SKU)
	}

	// AddItemToList on non-existing list should return error
	err = db.AddItemToList("list-2", item)
	if err == nil {
		t.Error("Expected error when adding item to non-existing list")
	}

	// 6. DeleteItem
	err = db.DeleteItem("list-1", "sku-1")
	if err != nil {
		t.Fatalf("Failed to delete item: %v", err)
	}
	retrieved, _ = db.GetListByID("list-1")
	if len(retrieved.Items) != 0 {
		t.Errorf("Expected 0 items in list, got %d", len(retrieved.Items))
	}

	// DeleteItem on non-existing list or non-existing item
	err = db.DeleteItem("list-2", "sku-1")
	if err == nil {
		t.Error("Expected error when deleting item from non-existing list")
	}
	err = db.DeleteItem("list-1", "sku-1")
	if err == nil {
		t.Error("Expected error when deleting non-existing item from list")
	}

	// 7. DeleteList
	err = db.DeleteList("list-1")
	if err != nil {
		t.Fatalf("Failed to delete list: %v", err)
	}
	_, err = db.GetListByID("list-1")
	if err == nil {
		t.Error("Expected list to be deleted, but it was found")
	}

	// DeleteList non-existing should return error
	err = db.DeleteList("list-1")
	if err == nil {
		t.Error("Expected error when deleting non-existing list")
	}
}

func TestMemDBToggleItem(t *testing.T) {
	db := New()

	list := &domain.List{
		ID:    "list-1",
		Title: "Toggle List",
		Items: []domain.Item{
			{SKU: "sku-1", ListID: "list-1", Description: "Milk", Quantity: 1},
			{SKU: "sku-2", ListID: "list-1", Description: "Bread", Quantity: 2},
		},
	}
	_ = db.CreateList(list)

	// Toggle non-existing list or item
	err := db.ToggleItem("list-2", "sku-1")
	if err == nil {
		t.Error("Expected error toggling in non-existing list")
	}
	err = db.ToggleItem("list-1", "sku-3")
	if err == nil {
		t.Error("Expected error toggling non-existing item")
	}

	// First toggle of sku-1: should be removed from active items and added to deletedItems
	err = db.ToggleItem("list-1", "sku-1")
	if err != nil {
		t.Fatalf("Failed first toggle of sku-1: %v", err)
	}

	retrieved, _ := db.GetListByID("list-1")
	if len(retrieved.Items) != 1 {
		t.Fatalf("Expected 1 active item after toggle, got %d", len(retrieved.Items))
	}
	if retrieved.Items[0].SKU != "sku-2" {
		t.Errorf("Expected remaining item to be sku-2, got %s", retrieved.Items[0].SKU)
	}

	// Second toggle of sku-1: should be restored back to the list
	err = db.ToggleItem("list-1", "sku-1")
	if err != nil {
		t.Fatalf("Failed second toggle of sku-1: %v", err)
	}

	retrieved, _ = db.GetListByID("list-1")
	if len(retrieved.Items) != 2 {
		t.Fatalf("Expected 2 active items after toggle-restore, got %d", len(retrieved.Items))
	}
	// Let's check that sku-1 is present
	found := false
	for _, item := range retrieved.Items {
		if item.SKU == "sku-1" {
			found = true
			if item.Description != "Milk" || item.Quantity != 1 {
				t.Errorf("Restored item fields mismatch: %+v", item)
			}
		}
	}
	if !found {
		t.Error("sku-1 not restored to list after second toggle")
	}
}

func TestMemDBConcurrency(t *testing.T) {
	db := New()
	numGoroutines := 20
	var wg sync.WaitGroup

	// Pre-create lists
	for i := 0; i < numGoroutines; i++ {
		listID := fmt.Sprintf("list-%d", i)
		_ = db.CreateList(&domain.List{
			ID:    listID,
			Title: fmt.Sprintf("List %d", i),
			Items: []domain.Item{},
		})
	}

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			listID := fmt.Sprintf("list-%d", id)
			itemSKU := fmt.Sprintf("sku-%d", id)

			// Overlapping operations
			// 1. Get all lists
			_, _ = db.GetAllLists()

			// 2. Get list by ID
			_, _ = db.GetListByID(listID)

			// 3. Add Item
			_ = db.AddItemToList(listID, &domain.Item{
				SKU:      itemSKU,
				ListID:   listID,
				Quantity: 1,
			})

			// 4. Toggle Item (remove)
			_ = db.ToggleItem(listID, itemSKU)

			// 5. Toggle Item (restore)
			_ = db.ToggleItem(listID, itemSKU)

			// 6. Delete Item
			_ = db.DeleteItem(listID, itemSKU)

			// 7. Try Delete List
			_ = db.DeleteList(listID)
		}(i)
	}

	wg.Wait()
}
