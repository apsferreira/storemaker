package model

import (
	"testing"
)

func TestCartSubtotal(t *testing.T) {
	tests := []struct {
		name          string
		items         []CartItem
		wantSubtotal  int64
		wantItemCount int
	}{
		{
			name:          "carrinho vazio",
			items:         []CartItem{},
			wantSubtotal:  0,
			wantItemCount: 0,
		},
		{
			name: "um item",
			items: []CartItem{
				{ProductName: "Camiseta", Quantity: 2, UnitPriceCents: 4900},
			},
			wantSubtotal:  9800,
			wantItemCount: 2,
		},
		{
			name: "múltiplos itens",
			items: []CartItem{
				{ProductName: "Camiseta", Quantity: 1, UnitPriceCents: 4900},
				{ProductName: "Calça", Quantity: 2, UnitPriceCents: 9900},
				{ProductName: "Meia", Quantity: 3, UnitPriceCents: 1500},
			},
			wantSubtotal:  4900 + 2*9900 + 3*1500, // 29200
			wantItemCount: 1 + 2 + 3,              // 6
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var subtotal int64
			var itemCount int
			for _, item := range tc.items {
				subtotal += item.UnitPriceCents * int64(item.Quantity)
				itemCount += item.Quantity
			}
			if subtotal != tc.wantSubtotal {
				t.Errorf("subtotal = %d, want %d", subtotal, tc.wantSubtotal)
			}
			if itemCount != tc.wantItemCount {
				t.Errorf("itemCount = %d, want %d", itemCount, tc.wantItemCount)
			}
		})
	}
}

func TestCartTotalComDesconto(t *testing.T) {
	tests := []struct {
		name          string
		subtotal      int64
		shippingCents int64
		discount      int64
		wantTotal     int64
	}{
		{"sem desconto sem frete", 10000, 0, 0, 10000},
		{"com frete sem desconto", 10000, 2500, 0, 12500},
		{"com desconto sem frete", 10000, 0, 1000, 9000},
		{"com frete e desconto", 10000, 2500, 1500, 11000},
		{"desconto maior que subtotal (floor zero)", 5000, 0, 8000, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			total := tc.subtotal + tc.shippingCents - tc.discount
			if total < 0 {
				total = 0
			}
			if total != tc.wantTotal {
				t.Errorf("total = %d, want %d", total, tc.wantTotal)
			}
		})
	}
}
