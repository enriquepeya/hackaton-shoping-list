package services

import (
	"backend/internal/domain"
	"backend/internal/ports"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ListService handles the core business logic for lists and their items.
type ListService struct {
	repo ports.ListRepository
}

// NewListService creates a new instance of ListService.
func NewListService(repo ports.ListRepository) *ListService {
	return &ListService{
		repo: repo,
	}
}

// CreateList validates a list, generates an ID and timestamps, and creates it in the repository.
func (s *ListService) CreateList(list *domain.List) error {
	if list == nil {
		return errors.New("list cannot be nil")
	}
	if list.Title == "" {
		return errors.New("title cannot be empty")
	}
	if list.OwnerID == "" {
		return errors.New("owner ID cannot be empty")
	}
	if len(list.Items) == 0 {
		return errors.New("list must contain at least one item")
	}

	if list.ID == "" {
		list.ID = uuid.New().String()
	}

	// Validate and configure nested items
	for i := range list.Items {
		if err := validateItem(&list.Items[i]); err != nil {
			return err
		}
		list.Items[i].ListID = list.ID
	}

	now := time.Now()
	list.CreatedAt = now
	list.UpdatedAt = now

	return s.repo.CreateList(list)
}

// GetListByID retrieves a list by its ID.
func (s *ListService) GetListByID(id string) (*domain.List, error) {
	if id == "" {
		return nil, errors.New("id cannot be empty")
	}
	return s.repo.GetListByID(id)
}

// GetAllLists retrieves all lists.
func (s *ListService) GetAllLists() ([]*domain.List, error) {
	return s.repo.GetAllLists()
}

// AddItemToList validates an item and adds it to a list.
func (s *ListService) AddItemToList(listID string, item *domain.Item) error {
	if listID == "" {
		return errors.New("list ID cannot be empty")
	}
	if err := validateItem(item); err != nil {
		return err
	}

	item.ListID = listID
	return s.repo.AddItemToList(listID, item)
}

func validateItem(item *domain.Item) error {
	if item == nil {
		return errors.New("item cannot be nil")
	}
	if item.SKU == "" {
		return errors.New("SKU cannot be empty")
	}
	if item.Description == "" {
		return errors.New("description cannot be empty")
	}
	if item.Quantity <= 0 {
		return errors.New("quantity must be greater than zero")
	}
	return nil
}

// ToggleItem toggles the active state of an item in a list.
func (s *ListService) ToggleItem(listID string, itemID string) error {
	if listID == "" {
		return errors.New("list ID cannot be empty")
	}
	if itemID == "" {
		return errors.New("item ID cannot be empty")
	}
	return s.repo.ToggleItem(listID, itemID)
}

// DeleteItem removes an item from a list.
func (s *ListService) DeleteItem(listID string, itemID string) error {
	if listID == "" {
		return errors.New("list ID cannot be empty")
	}
	if itemID == "" {
		return errors.New("item ID cannot be empty")
	}
	return s.repo.DeleteItem(listID, itemID)
}

// DeleteList removes a list completely.
func (s *ListService) DeleteList(id string) error {
	if id == "" {
		return errors.New("id cannot be empty")
	}
	return s.repo.DeleteList(id)
}
