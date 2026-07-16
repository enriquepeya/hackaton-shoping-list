package ports

import "backend/internal/domain"

type ListRepository interface {
	CreateList(list *domain.List) error
	GetListByID(id string) (*domain.List, error)
	GetAllLists() ([]*domain.List, error)
	AddItemToList(listID string, item *domain.Item) error
	ToggleItem(listID string, itemID string) error
	DeleteItem(listID string, itemID string) error
	DeleteList(id string) error
}
