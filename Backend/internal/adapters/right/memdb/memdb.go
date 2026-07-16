package memdb

import (
	"backend/internal/domain"
	"errors"
	"sync"
)

// MemDB implements ports.ListRepository using an in-memory map.
type MemDB struct {
	mu           sync.RWMutex
	lists        map[string]*domain.List
	deletedItems map[string][]domain.Item
}

// New creates and returns a new instance of MemDB.
func New() *MemDB {
	return &MemDB{
		lists:        make(map[string]*domain.List),
		deletedItems: make(map[string][]domain.Item),
	}
}

// copyList creates a deep copy of a domain.List structure to ensure concurrency safety.
func copyList(l *domain.List) *domain.List {
	if l == nil {
		return nil
	}
	cp := *l
	if l.Items != nil {
		cp.Items = make([]domain.Item, len(l.Items))
		copy(cp.Items, l.Items)
	}
	if l.VendorAssociated != nil {
		va := *l.VendorAssociated
		cp.VendorAssociated = &va
	}
	if l.DeletedAt != nil {
		da := *l.DeletedAt
		cp.DeletedAt = &da
	}
	return &cp
}

// CreateList adds a new list to the database. Returns an error if the list already exists.
func (db *MemDB) CreateList(list *domain.List) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	if _, exists := db.lists[list.ID]; exists {
		return errors.New("list already exists")
	}

	db.lists[list.ID] = copyList(list)
	return nil
}

// GetListByID retrieves a list by its unique identifier.
func (db *MemDB) GetListByID(id string) (*domain.List, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	list, exists := db.lists[id]
	if !exists {
		return nil, errors.New("list not found")
	}

	return copyList(list), nil
}

// GetAllLists retrieves all lists currently in the database.
func (db *MemDB) GetAllLists() ([]*domain.List, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	res := make([]*domain.List, 0, len(db.lists))
	for _, l := range db.lists {
		res = append(res, copyList(l))
	}
	return res, nil
}

// AddItemToList adds an item to a specific list.
func (db *MemDB) AddItemToList(listID string, item *domain.Item) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	list, exists := db.lists[listID]
	if !exists {
		return errors.New("list not found")
	}

	for _, it := range list.Items {
		if it.SKU == item.SKU {
			return errors.New("item with SKU already exists in list")
		}
	}

	list.Items = append(list.Items, *item)
	return nil
}

// ToggleItem toggles the state of an item in a list (soft delete and restore logic).
func (db *MemDB) ToggleItem(listID string, itemID string) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	list, exists := db.lists[listID]
	if !exists {
		return errors.New("list not found")
	}

	// Check if the item is currently active in list.Items
	foundIdx := -1
	for i, it := range list.Items {
		if it.SKU == itemID {
			foundIdx = i
			break
		}
	}

	if foundIdx != -1 {
		// If found: remove from active items and append to deletedItems
		item := list.Items[foundIdx]
		list.Items = append(list.Items[:foundIdx], list.Items[foundIdx+1:]...)
		db.deletedItems[listID] = append(db.deletedItems[listID], item)
		return nil
	}

	// If not found: check if it is in the deleted/toggled-off history
	deletedList, existsDeleted := db.deletedItems[listID]
	if existsDeleted {
		foundDelIdx := -1
		for i, it := range deletedList {
			if it.SKU == itemID {
				foundDelIdx = i
				break
			}
		}

		if foundDelIdx != -1 {
			// If found: restore to active list and remove from deletedItems
			item := deletedList[foundDelIdx]
			db.deletedItems[listID] = append(deletedList[:foundDelIdx], deletedList[foundDelIdx+1:]...)
			list.Items = append(list.Items, item)
			return nil
		}
	}

	return errors.New("item not found in active items or deleted history")
}

// DeleteItem removes an item permanently from a list's active items.
func (db *MemDB) DeleteItem(listID string, itemID string) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	list, exists := db.lists[listID]
	if !exists {
		return errors.New("list not found")
	}

	foundIdx := -1
	for i, it := range list.Items {
		if it.SKU == itemID {
			foundIdx = i
			break
		}
	}

	if foundIdx == -1 {
		return errors.New("item not found")
	}

	list.Items = append(list.Items[:foundIdx], list.Items[foundIdx+1:]...)
	return nil
}

// DeleteList permanently deletes a list and its associated metadata from the database.
func (db *MemDB) DeleteList(id string) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	if _, exists := db.lists[id]; !exists {
		return errors.New("list not found")
	}

	delete(db.lists, id)
	delete(db.deletedItems, id)
	return nil
}
