package model

import "time"

type Cart struct {
	ID        string     `json:"id"`
	SessionID string     `json:"session_id"`
	StoreID   string     `json:"store_id"`
	Items     []CartItem `json:"items"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CartItem struct {
	ID             string  `json:"id"`
	CartID         string  `json:"cart_id"`
	ProductID      string  `json:"product_id"`
	VariantID      *string `json:"variant_id,omitempty"`
	Quantity       int     `json:"quantity"`
	UnitPriceCents int64   `json:"unit_price_cents"`
	ProductName    string  `json:"product_name,omitempty"`
	VariantName    string  `json:"variant_name,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type AddToCartRequest struct {
	StoreID   string  `json:"store_id"`
	ProductID string  `json:"product_id"`
	VariantID *string `json:"variant_id,omitempty"`
	Quantity  int     `json:"quantity"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity"`
}

type RemoveFromCartRequest struct {
	ItemID string `json:"item_id"`
}

type CartResponse struct {
	Cart         Cart  `json:"cart"`
	SubtotalCents int64 `json:"subtotal_cents"`
	ItemCount     int   `json:"item_count"`
}
