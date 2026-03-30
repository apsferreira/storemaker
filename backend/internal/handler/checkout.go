package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/repository"
)

// Checkout processa o checkout: valida carrinho, aplica cupom, cria pedido.
func Checkout(c *fiber.Ctx) error {
	var req model.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	// Validação de inputs
	if err := validateCheckout(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	sessionID := getSessionID(c)

	// Buscar carrinho
	cart, err := repository.GetCart(sessionID, req.StoreID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao buscar carrinho"})
	}
	if cart == nil || len(cart.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "carrinho vazio"})
	}

	// Calcular subtotal
	var subtotalCents int64
	for _, item := range cart.Items {
		subtotalCents += item.UnitPriceCents * int64(item.Quantity)
	}

	// Validar estoque de cada item
	for _, item := range cart.Items {
		if err := validateStock(req.StoreID, item); err != nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":      err.Error(),
				"product_id": item.ProductID,
			})
		}
	}

	// Aplicar cupom se informado
	var discountCents int64
	var couponID string
	if req.CouponCode != "" {
		result, err := repository.ValidateCoupon(req.StoreID, req.CouponCode, subtotalCents)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao validar cupom"})
		}
		if !result.Valid {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": result.Message})
		}
		discountCents = result.DiscountCents
		couponID = result.CouponID
	}

	// Calcular total
	totalCents := subtotalCents + req.ShippingCents - discountCents
	if totalCents < 0 {
		totalCents = 0
	}

	// Criar pedido
	order := &model.Order{
		StoreID:       req.StoreID,
		CustomerName:  req.CustomerName,
		CustomerEmail: req.CustomerEmail,
		CustomerPhone: req.CustomerPhone,
		Address:       req.Address,
		SubtotalCents: subtotalCents,
		ShippingCents: req.ShippingCents,
		DiscountCents: discountCents,
		TotalCents:    totalCents,
		PaymentMethod: req.PaymentMethod,
		Notes:         req.Notes,
	}

	createdOrder, err := repository.CreateOrder(order, cart.Items)
	if err != nil {
		log.Error().Err(err).Msg("erro ao criar pedido")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao criar pedido"})
	}

	// Incrementar uso do cupom
	if couponID != "" {
		if err := repository.IncrementCouponUsage(couponID); err != nil {
			log.Error().Err(err).Str("coupon_id", couponID).Msg("erro ao incrementar uso do cupom")
		}
	}

	// Limpar carrinho após pedido criado
	if err := repository.ClearCart(cart.ID); err != nil {
		log.Error().Err(err).Str("cart_id", cart.ID).Msg("erro ao limpar carrinho")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"order":   createdOrder,
		"message": "pedido criado com sucesso",
	})
}

func validateCheckout(req model.CheckoutRequest) error {
	if strings.TrimSpace(req.StoreID) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "store_id é obrigatório")
	}
	if strings.TrimSpace(req.CustomerName) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "customer_name é obrigatório")
	}
	if len(req.CustomerName) > 255 {
		return fiber.NewError(fiber.StatusBadRequest, "customer_name muito longo")
	}
	if strings.TrimSpace(req.CustomerEmail) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "customer_email é obrigatório")
	}
	if !strings.Contains(req.CustomerEmail, "@") || len(req.CustomerEmail) > 255 {
		return fiber.NewError(fiber.StatusBadRequest, "customer_email inválido")
	}
	if len(req.CustomerPhone) > 20 {
		return fiber.NewError(fiber.StatusBadRequest, "customer_phone muito longo")
	}
	if req.ShippingCents < 0 {
		return fiber.NewError(fiber.StatusBadRequest, "shipping_cents deve ser >= 0")
	}

	validMethods := map[string]bool{"pix": true, "cartao": true, "boleto": true}
	if !validMethods[strings.ToLower(req.PaymentMethod)] {
		return fiber.NewError(fiber.StatusBadRequest, "payment_method inválido (pix, cartao, boleto)")
	}

	return nil
}

// validateStock verifica se o produto tem estoque suficiente.
func validateStock(storeID string, item model.CartItem) error {
	product, err := repository.GetProduct(storeID, item.ProductID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "erro ao verificar estoque")
	}
	if product == nil {
		return fiber.NewError(fiber.StatusNotFound, "produto não encontrado: "+item.ProductName)
	}

	if item.VariantID != nil && *item.VariantID != "" {
		variant, err := repository.GetVariation(*item.VariantID)
		if err != nil || variant == nil {
			return fiber.NewError(fiber.StatusNotFound, "variação não encontrada: "+item.VariantName)
		}
		if variant.StockQuantity < item.Quantity {
			return fiber.NewError(fiber.StatusConflict,
				"estoque insuficiente para "+item.ProductName+" ("+item.VariantName+")")
		}
	} else if product.StockQuantity < item.Quantity {
		return fiber.NewError(fiber.StatusConflict,
			"estoque insuficiente para "+item.ProductName)
	}

	return nil
}
