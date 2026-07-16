package domain

import "time"

// Item represents an individual shopping list item.
type Item struct {
	SKU           string  `json:"sku"`
	EAN           *string `json:"ean"`
	ListID        string  `json:"listId"`
	Description   string  `json:"description"`
	Quantity      int     `json:"quantity"`
	AddedByUserID string  `json:"addedByUserId"`
}

// List represents a collaborative shopping list.
type List struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Items            []Item     `json:"items"`
	VendorAssociated *string    `json:"vendorAssociated"`
	OwnerID          string     `json:"ownerId"`
	ListType         string     `json:"listType"` // "PRIVATE" or "PUBLIC"
	IsSharable       bool       `json:"isSharable"`
	Image            string     `json:"image"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	DeletedAt        *time.Time `json:"deletedAt"`
	LastPurchaseDate time.Time  `json:"lastPurchaseDate"`
	AddedByUserID    string     `json:"addedByUserId"`
}

// User represents a user who can own or access shopping lists.
type User struct {
	UserID   string    `json:"userId"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joinedAt"`
}
