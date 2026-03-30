package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/pkg/database"
)

// CreateCoupon cria um novo cupom.
func CreateCoupon(storeID string, req model.CreateCouponRequest) (*model.Coupon, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	c := &model.Coupon{}
	var validUntil sql.NullTime

	err := database.DB.QueryRow(
		`INSERT INTO cupons (loja_id, code, discount_type, discount_value, min_order_cents,
		 max_uses, valid_until, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, loja_id, code, discount_type, discount_value, min_order_cents,
		 max_uses, used_count, valid_until, is_active, created_at`,
		storeID, req.Code, req.DiscountType, req.DiscountValue, req.MinOrderCents,
		req.MaxUses, req.ValidUntil, isActive,
	).Scan(&c.ID, &c.StoreID, &c.Code, &c.DiscountType, &c.DiscountValue,
		&c.MinOrderCents, &c.MaxUses, &c.UsedCount, &validUntil, &c.IsActive, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cupom: %w", err)
	}
	if validUntil.Valid {
		c.ValidUntil = &validUntil.Time
	}
	return c, nil
}

// GetCoupon busca um cupom por ID.
func GetCoupon(storeID, couponID string) (*model.Coupon, error) {
	c := &model.Coupon{}
	var validUntil sql.NullTime

	err := database.DB.QueryRow(
		`SELECT id, loja_id, code, discount_type, discount_value, min_order_cents,
		 max_uses, used_count, valid_until, is_active, created_at
		 FROM cupons
		 WHERE id = $1 AND loja_id = $2`,
		couponID, storeID,
	).Scan(&c.ID, &c.StoreID, &c.Code, &c.DiscountType, &c.DiscountValue,
		&c.MinOrderCents, &c.MaxUses, &c.UsedCount, &validUntil, &c.IsActive, &c.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar cupom: %w", err)
	}
	if validUntil.Valid {
		c.ValidUntil = &validUntil.Time
	}
	return c, nil
}

// ListCoupons lista cupons de uma loja.
func ListCoupons(storeID string) ([]model.Coupon, error) {
	rows, err := database.DB.Query(
		`SELECT id, loja_id, code, discount_type, discount_value, min_order_cents,
		 max_uses, used_count, valid_until, is_active, created_at
		 FROM cupons
		 WHERE loja_id = $1
		 ORDER BY created_at DESC`,
		storeID,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar cupons: %w", err)
	}
	defer rows.Close()

	var coupons []model.Coupon
	for rows.Next() {
		var c model.Coupon
		var validUntil sql.NullTime
		if err := rows.Scan(&c.ID, &c.StoreID, &c.Code, &c.DiscountType, &c.DiscountValue,
			&c.MinOrderCents, &c.MaxUses, &c.UsedCount, &validUntil, &c.IsActive,
			&c.CreatedAt); err != nil {
			return nil, fmt.Errorf("erro ao escanear cupom: %w", err)
		}
		if validUntil.Valid {
			c.ValidUntil = &validUntil.Time
		}
		coupons = append(coupons, c)
	}
	return coupons, nil
}

// UpdateCoupon atualiza um cupom.
func UpdateCoupon(storeID, couponID string, req model.UpdateCouponRequest) (*model.Coupon, error) {
	c := &model.Coupon{}
	var validUntil sql.NullTime

	err := database.DB.QueryRow(
		`UPDATE cupons SET
		 code = COALESCE($1, code),
		 discount_type = COALESCE($2, discount_type),
		 discount_value = COALESCE($3, discount_value),
		 min_order_cents = COALESCE($4, min_order_cents),
		 max_uses = COALESCE($5, max_uses),
		 valid_until = COALESCE($6, valid_until),
		 is_active = COALESCE($7, is_active)
		 WHERE id = $8 AND loja_id = $9
		 RETURNING id, loja_id, code, discount_type, discount_value, min_order_cents,
		 max_uses, used_count, valid_until, is_active, created_at`,
		req.Code, req.DiscountType, req.DiscountValue, req.MinOrderCents,
		req.MaxUses, req.ValidUntil, req.IsActive, couponID, storeID,
	).Scan(&c.ID, &c.StoreID, &c.Code, &c.DiscountType, &c.DiscountValue,
		&c.MinOrderCents, &c.MaxUses, &c.UsedCount, &validUntil, &c.IsActive, &c.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao atualizar cupom: %w", err)
	}
	if validUntil.Valid {
		c.ValidUntil = &validUntil.Time
	}
	return c, nil
}

// DeleteCoupon exclui um cupom.
func DeleteCoupon(storeID, couponID string) error {
	result, err := database.DB.Exec(
		`DELETE FROM cupons WHERE id = $1 AND loja_id = $2`,
		couponID, storeID,
	)
	if err != nil {
		return fmt.Errorf("erro ao deletar cupom: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("cupom não encontrado")
	}
	return nil
}

// ValidateCoupon valida um cupom e retorna o desconto calculado.
func ValidateCoupon(storeID, code string, subtotalCents int64) (*model.ValidateCouponResponse, error) {
	c := &model.Coupon{}
	var validUntil sql.NullTime

	err := database.DB.QueryRow(
		`SELECT id, loja_id, code, discount_type, discount_value, min_order_cents,
		 max_uses, used_count, valid_until, is_active
		 FROM cupons
		 WHERE loja_id = $1 AND code = $2`,
		storeID, code,
	).Scan(&c.ID, &c.StoreID, &c.Code, &c.DiscountType, &c.DiscountValue,
		&c.MinOrderCents, &c.MaxUses, &c.UsedCount, &validUntil, &c.IsActive)
	if err == sql.ErrNoRows {
		return &model.ValidateCouponResponse{Valid: false, Message: "cupom não encontrado"}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar cupom: %w", err)
	}

	if !c.IsActive {
		return &model.ValidateCouponResponse{Valid: false, Message: "cupom inativo"}, nil
	}

	if validUntil.Valid && validUntil.Time.Before(time.Now()) {
		return &model.ValidateCouponResponse{Valid: false, Message: "cupom expirado"}, nil
	}

	if c.MaxUses > 0 && c.UsedCount >= c.MaxUses {
		return &model.ValidateCouponResponse{Valid: false, Message: "cupom esgotado"}, nil
	}

	if subtotalCents < c.MinOrderCents {
		return &model.ValidateCouponResponse{
			Valid:   false,
			Message: fmt.Sprintf("pedido mínimo: R$ %.2f", float64(c.MinOrderCents)/100),
		}, nil
	}

	var discountCents int64
	switch c.DiscountType {
	case "percent":
		discountCents = subtotalCents * c.DiscountValue / 100
	case "fixed":
		discountCents = c.DiscountValue
		if discountCents > subtotalCents {
			discountCents = subtotalCents
		}
	default:
		return &model.ValidateCouponResponse{Valid: false, Message: "tipo de desconto inválido"}, nil
	}

	return &model.ValidateCouponResponse{
		Valid:         true,
		DiscountCents: discountCents,
		CouponID:      c.ID,
	}, nil
}

// IncrementCouponUsage incrementa o contador de uso do cupom.
func IncrementCouponUsage(couponID string) error {
	_, err := database.DB.Exec(
		`UPDATE cupons SET used_count = used_count + 1 WHERE id = $1`,
		couponID,
	)
	if err != nil {
		return fmt.Errorf("erro ao incrementar uso do cupom: %w", err)
	}
	return nil
}
