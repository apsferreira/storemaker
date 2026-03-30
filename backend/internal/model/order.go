package model

import "time"

type Order struct {
	ID              string      `json:"id"`
	StoreID         string      `json:"store_id"`
	CustomerName    string      `json:"customer_name"`
	CustomerEmail   string      `json:"customer_email"`
	CustomerPhone   string      `json:"customer_phone"`
	Address         interface{} `json:"address"`
	Status          string      `json:"status"`
	SubtotalCents   int64       `json:"subtotal_cents"`
	ShippingCents   int64       `json:"shipping_cents"`
	DiscountCents   int64       `json:"discount_cents"`
	TotalCents      int64       `json:"total_cents"`
	PaymentMethod   string      `json:"payment_method"`
	PaymentID       string      `json:"payment_id,omitempty"`
	TrackingCode    string      `json:"tracking_code,omitempty"`
	Notes           string      `json:"notes,omitempty"`
	Items           []OrderItem `json:"items,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID             string    `json:"id"`
	OrderID        string    `json:"order_id"`
	ProductID      string    `json:"product_id"`
	ProductName    string    `json:"product_name"`
	Variant        string    `json:"variant,omitempty"`
	Quantity       int       `json:"quantity"`
	UnitPriceCents int64     `json:"unit_price_cents"`
	CreatedAt      time.Time `json:"created_at"`
}

type CheckoutRequest struct {
	StoreID       string      `json:"store_id"`
	CustomerName  string      `json:"customer_name"`
	CustomerEmail string      `json:"customer_email"`
	CustomerPhone string      `json:"customer_phone"`
	Address       interface{} `json:"address"`
	ShippingCents int64       `json:"shipping_cents"`
	CouponCode    string      `json:"coupon_code,omitempty"`
	PaymentMethod string      `json:"payment_method"`
	Notes         string      `json:"notes,omitempty"`
}

type UpdateOrderStatusRequest struct {
	Status       string `json:"status"`
	TrackingCode string `json:"tracking_code,omitempty"`
}

type OrderListFilter struct {
	Status  *string
	Search  *string
	Page    int
	PerPage int
}

type PaymentWebhookPayload struct {
	Event     string `json:"event"`
	PaymentID string `json:"payment_id"`
	Status    string `json:"status"`
	OrderID   string `json:"order_id"`
}
