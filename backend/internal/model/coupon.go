package model

import "time"

type Coupon struct {
	ID            string     `json:"id"`
	StoreID       string     `json:"store_id"`
	Code          string     `json:"code"`
	DiscountType  string     `json:"discount_type"`
	DiscountValue int64      `json:"discount_value"`
	MinOrderCents int64      `json:"min_order_cents"`
	MaxUses       int        `json:"max_uses"`
	UsedCount     int        `json:"used_count"`
	ValidUntil    *time.Time `json:"valid_until,omitempty"`
	IsActive      bool       `json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
}

type CreateCouponRequest struct {
	Code          string     `json:"code"`
	DiscountType  string     `json:"discount_type"`
	DiscountValue int64      `json:"discount_value"`
	MinOrderCents int64      `json:"min_order_cents"`
	MaxUses       int        `json:"max_uses"`
	ValidUntil    *time.Time `json:"valid_until,omitempty"`
	IsActive      *bool      `json:"is_active,omitempty"`
}

type UpdateCouponRequest struct {
	Code          *string    `json:"code,omitempty"`
	DiscountType  *string    `json:"discount_type,omitempty"`
	DiscountValue *int64     `json:"discount_value,omitempty"`
	MinOrderCents *int64     `json:"min_order_cents,omitempty"`
	MaxUses       *int       `json:"max_uses,omitempty"`
	ValidUntil    *time.Time `json:"valid_until,omitempty"`
	IsActive      *bool      `json:"is_active,omitempty"`
}

type ValidateCouponRequest struct {
	StoreID       string `json:"store_id"`
	Code          string `json:"code"`
	SubtotalCents int64  `json:"subtotal_cents"`
}

type ValidateCouponResponse struct {
	Valid         bool   `json:"valid"`
	Message       string `json:"message,omitempty"`
	DiscountCents int64  `json:"discount_cents"`
	CouponID      string `json:"coupon_id,omitempty"`
}
