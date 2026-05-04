package model

import "testing"

func TestProduct_PrecoComDesconto(t *testing.T) {
	tests := []struct {
		name              string
		priceCents        int64
		comparePriceCents int64
		wantDiscount      bool
		wantSavings       int64
	}{
		{"sem desconto (compare == 0)", 9900, 0, false, 0},
		{"sem desconto (compare == price)", 9900, 9900, false, 0},
		{"com desconto", 7900, 9900, true, 2000},
		{"compare menor que price (invalido)", 9900, 5000, false, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p := Product{PriceCents: tc.priceCents, ComparePriceCents: tc.comparePriceCents}
			hasDiscount := p.ComparePriceCents > 0 && p.ComparePriceCents > p.PriceCents
			if hasDiscount != tc.wantDiscount {
				t.Errorf("hasDiscount = %v, want %v", hasDiscount, tc.wantDiscount)
			}
			var savings int64
			if hasDiscount {
				savings = p.ComparePriceCents - p.PriceCents
			}
			if savings != tc.wantSavings {
				t.Errorf("savings = %d, want %d", savings, tc.wantSavings)
			}
		})
	}
}

func TestProductVariation_PrecoFinal(t *testing.T) {
	basePrice := int64(9900)
	tests := []struct {
		name          string
		adjustment    int64
		wantFinal     int64
	}{
		{"sem ajuste", 0, 9900},
		{"ajuste positivo (+R$10)", 1000, 10900},
		{"ajuste negativo (-R$5)", -500, 9400},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			v := ProductVariation{PriceAdjustmentCents: tc.adjustment}
			final := basePrice + v.PriceAdjustmentCents
			if final != tc.wantFinal {
				t.Errorf("final = %d, want %d", final, tc.wantFinal)
			}
		})
	}
}

func TestProductListFilter_Paginacao(t *testing.T) {
	f := ProductListFilter{Page: 2, PerPage: 20}
	offset := (f.Page - 1) * f.PerPage
	if offset != 20 {
		t.Errorf("offset = %d, want 20", offset)
	}

	f2 := ProductListFilter{Page: 1, PerPage: 10}
	offset2 := (f2.Page - 1) * f2.PerPage
	if offset2 != 0 {
		t.Errorf("offset2 = %d, want 0", offset2)
	}
}

func TestPaginatedResponse_TotalPages(t *testing.T) {
	tests := []struct {
		total      int
		perPage    int
		wantPages  int
	}{
		{0, 10, 0},
		{10, 10, 1},
		{11, 10, 2},
		{100, 20, 5},
		{101, 20, 6},
	}

	for _, tc := range tests {
		pages := (tc.total + tc.perPage - 1) / tc.perPage
		if tc.total == 0 {
			pages = 0
		}
		if pages != tc.wantPages {
			t.Errorf("total=%d perPage=%d: pages=%d, want %d", tc.total, tc.perPage, pages, tc.wantPages)
		}
	}
}
