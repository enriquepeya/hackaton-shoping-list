package domain

import "time"

// Item represents an individual shopping list item.
type Item struct {
	// The Stock Keeping Unit identifier
	SKU           string  `json:"sku" example:"SKU-1001"`
	// The European Article Number barcode
	EAN           *string `json:"ean" example:"1234567890123"`
	// The identifier of the list this item belongs to
	ListID        string  `json:"listId" example:"list-456"`
	// The item's description or name
	Description   string  `json:"description" example:"Whole Milk 1L"`
	// The quantity of the item
	Quantity      int     `json:"quantity" example:"2"`
	// The user ID of the person who added this item
	AddedByUserID string  `json:"addedByUserId" example:"user-123"`
}

// List represents a collaborative shopping list.
type List struct {
	// The unique list identifier
	ID               string     `json:"id" example:"list-456"`
	// The title/name of the shopping list
	Title            string     `json:"title" example:"Weekly Groceries"`
	// The list of items belonging to this shopping list
	Items            []Item     `json:"items"`
	// Optional associated vendor
	VendorAssociated *string    `json:"vendorAssociated" example:"Supermarket"`
	// The owner's user ID
	OwnerID          string     `json:"ownerId" example:"user-123"`
	// The accessibility type of the list. Allowed values: PRIVATE, PUBLIC.
	ListType         string     `json:"listType" example:"PRIVATE"` // "PRIVATE" or "PUBLIC"
	// Flag indicating if other users can access/join this list
	IsSharable       bool       `json:"isSharable" example:"true"`
	// Optional image URL for the list
	Image            string     `json:"image" example:"https://example.com/images/list.jpg"`
	// Timestamp when the list was created
	CreatedAt        time.Time  `json:"createdAt" example:"2026-07-16T12:00:00Z"`
	// Timestamp of the last update to the list
	UpdatedAt        time.Time  `json:"updatedAt" example:"2026-07-16T12:05:00Z"`
	// Timestamp when the list was deleted, if any
	DeletedAt        *time.Time `json:"deletedAt"`
	// Timestamp of the last purchase operation
	LastPurchaseDate time.Time  `json:"lastPurchaseDate" example:"2026-07-16T12:05:00Z"`
	// The user ID of the person who last added an item
	AddedByUserID    string     `json:"addedByUserId" example:"user-123"`
}

// User represents a user who can own or access shopping lists.
type User struct {
	// The unique identifier of the user
	UserID   string    `json:"userId" example:"user-123"`
	// The role assigned to the user
	Role     string    `json:"role" example:"ADMIN"`
	// Timestamp when the user joined
	JoinedAt time.Time `json:"joinedAt" example:"2026-07-16T10:00:00Z"`
}

