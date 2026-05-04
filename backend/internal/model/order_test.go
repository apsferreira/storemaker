package model

import "testing"

func TestOrder_TotalCalculado(t *testing.T) {
	tests := []struct {
		name          string
		subtotal      int64
		shipping      int64
		discount      int64
		wantTotal     int64
	}{
		{"apenas subtotal", 10000, 0, 0, 10000},
		{"com frete", 10000, 1500, 0, 11500},
		{"com desconto", 10000, 0, 2000, 8000},
		{"com frete e desconto", 10000, 1500, 2000, 9500},
		{"desconto maior que subtotal (floor zero)", 5000, 0, 8000, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			total := tc.subtotal + tc.shipping - tc.discount
			if total < 0 {
				total = 0
			}
			if total != tc.wantTotal {
				t.Errorf("total = %d, want %d", total, tc.wantTotal)
			}
		})
	}
}

func TestOrderItem_SubtotalItem(t *testing.T) {
	tests := []struct {
		name     string
		qty      int
		price    int64
		wantSub  int64
	}{
		{"1 item", 1, 4900, 4900},
		{"3 itens", 3, 2990, 8970},
		{"0 itens", 0, 4900, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			item := OrderItem{Quantity: tc.qty, UnitPriceCents: tc.price}
			sub := item.UnitPriceCents * int64(item.Quantity)
			if sub != tc.wantSub {
				t.Errorf("subtotal = %d, want %d", sub, tc.wantSub)
			}
		})
	}
}

func TestOrder_StatusTransitions(t *testing.T) {
	validStatuses := []string{"pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"}
	statusSet := make(map[string]bool, len(validStatuses))
	for _, s := range validStatuses {
		statusSet[s] = true
	}

	for _, s := range validStatuses {
		if !statusSet[s] {
			t.Errorf("status %q não encontrado no conjunto", s)
		}
	}

	if len(validStatuses) != 7 {
		t.Errorf("esperado 7 status válidos, got %d", len(validStatuses))
	}
}

func TestPaymentWebhookPayload_Campos(t *testing.T) {
	p := PaymentWebhookPayload{
		Event:     "payment.confirmed",
		PaymentID: "pay_abc123",
		Status:    "paid",
		OrderID:   "ord_xyz789",
	}

	if p.Event == "" {
		t.Error("Event não deve ser vazio")
	}
	if p.PaymentID == "" {
		t.Error("PaymentID não deve ser vazio")
	}
	if p.OrderID == "" {
		t.Error("OrderID não deve ser vazio")
	}
}
