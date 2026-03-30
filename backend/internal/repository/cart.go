package repository

import (
	"database/sql"
	"fmt"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/pkg/database"
)

// GetOrCreateCart busca ou cria um carrinho para a sessão/loja.
func GetOrCreateCart(sessionID, storeID string) (*model.Cart, error) {
	cart := &model.Cart{}
	err := database.DB.QueryRow(
		`INSERT INTO carts (session_id, store_id)
		 VALUES ($1, $2)
		 ON CONFLICT (session_id, store_id) DO UPDATE SET updated_at = NOW()
		 RETURNING id, session_id, store_id, created_at, updated_at`,
		sessionID, storeID,
	).Scan(&cart.ID, &cart.SessionID, &cart.StoreID, &cart.CreatedAt, &cart.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("erro ao obter/criar carrinho: %w", err)
	}
	return cart, nil
}

// GetCart retorna o carrinho com itens.
func GetCart(sessionID, storeID string) (*model.Cart, error) {
	cart := &model.Cart{}
	err := database.DB.QueryRow(
		`SELECT id, session_id, store_id, created_at, updated_at
		 FROM carts
		 WHERE session_id = $1 AND store_id = $2`,
		sessionID, storeID,
	).Scan(&cart.ID, &cart.SessionID, &cart.StoreID, &cart.CreatedAt, &cart.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar carrinho: %w", err)
	}

	items, err := GetCartItems(cart.ID)
	if err != nil {
		return nil, err
	}
	cart.Items = items
	return cart, nil
}

// GetCartItems retorna itens do carrinho com nome do produto.
func GetCartItems(cartID string) ([]model.CartItem, error) {
	rows, err := database.DB.Query(
		`SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity, ci.unit_price_cents,
		        p.name AS product_name,
		        COALESCE(pv.name || ': ' || pv.value, '') AS variant_name,
		        ci.created_at
		 FROM cart_items ci
		 JOIN produtos p ON p.id = ci.product_id
		 LEFT JOIN produto_variacoes pv ON pv.id = ci.variant_id
		 WHERE ci.cart_id = $1
		 ORDER BY ci.created_at ASC`,
		cartID,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar itens do carrinho: %w", err)
	}
	defer rows.Close()

	var items []model.CartItem
	for rows.Next() {
		var item model.CartItem
		if err := rows.Scan(&item.ID, &item.CartID, &item.ProductID, &item.VariantID,
			&item.Quantity, &item.UnitPriceCents, &item.ProductName, &item.VariantName,
			&item.CreatedAt); err != nil {
			return nil, fmt.Errorf("erro ao escanear item do carrinho: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

// AddToCart adiciona item ao carrinho (ou incrementa quantidade se já existe).
func AddToCart(cartID string, req model.AddToCartRequest) (*model.CartItem, error) {
	// Buscar preço atual do produto
	var priceCents int64
	var stockQty int
	err := database.DB.QueryRow(
		`SELECT price_cents, stock_quantity FROM produtos WHERE id = $1 AND is_active = true`,
		req.ProductID,
	).Scan(&priceCents, &stockQty)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("produto não encontrado ou inativo")
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar produto: %w", err)
	}

	// Se tem variação, ajustar preço e verificar estoque da variação
	if req.VariantID != nil && *req.VariantID != "" {
		var adjustCents int64
		var varStock int
		err := database.DB.QueryRow(
			`SELECT price_adjustment_cents, stock_quantity FROM produto_variacoes WHERE id = $1 AND produto_id = $2`,
			*req.VariantID, req.ProductID,
		).Scan(&adjustCents, &varStock)
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("variação não encontrada")
		}
		if err != nil {
			return nil, fmt.Errorf("erro ao buscar variação: %w", err)
		}
		priceCents += adjustCents
		stockQty = varStock
	}

	if req.Quantity > stockQty {
		return nil, fmt.Errorf("estoque insuficiente (disponível: %d)", stockQty)
	}

	item := &model.CartItem{}
	err = database.DB.QueryRow(
		`INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price_cents)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (cart_id, product_id, variant_id) DO UPDATE
		 SET quantity = cart_items.quantity + EXCLUDED.quantity,
		     unit_price_cents = EXCLUDED.unit_price_cents
		 RETURNING id, cart_id, product_id, variant_id, quantity, unit_price_cents, created_at`,
		cartID, req.ProductID, req.VariantID, req.Quantity, priceCents,
	).Scan(&item.ID, &item.CartID, &item.ProductID, &item.VariantID,
		&item.Quantity, &item.UnitPriceCents, &item.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("erro ao adicionar item ao carrinho: %w", err)
	}

	return item, nil
}

// UpdateCartItem atualiza a quantidade de um item.
func UpdateCartItem(cartID, itemID string, quantity int) (*model.CartItem, error) {
	item := &model.CartItem{}
	err := database.DB.QueryRow(
		`UPDATE cart_items SET quantity = $1
		 WHERE id = $2 AND cart_id = $3
		 RETURNING id, cart_id, product_id, variant_id, quantity, unit_price_cents, created_at`,
		quantity, itemID, cartID,
	).Scan(&item.ID, &item.CartID, &item.ProductID, &item.VariantID,
		&item.Quantity, &item.UnitPriceCents, &item.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("item não encontrado no carrinho")
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao atualizar item: %w", err)
	}
	return item, nil
}

// RemoveCartItem remove um item do carrinho.
func RemoveCartItem(cartID, itemID string) error {
	result, err := database.DB.Exec(
		`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`,
		itemID, cartID,
	)
	if err != nil {
		return fmt.Errorf("erro ao remover item: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("item não encontrado no carrinho")
	}
	return nil
}

// ClearCart remove todos os itens de um carrinho.
func ClearCart(cartID string) error {
	_, err := database.DB.Exec(`DELETE FROM cart_items WHERE cart_id = $1`, cartID)
	if err != nil {
		return fmt.Errorf("erro ao limpar carrinho: %w", err)
	}
	return nil
}
