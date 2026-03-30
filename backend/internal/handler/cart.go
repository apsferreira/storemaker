package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/repository"
)

// getSessionID extrai session_id do header X-Session-ID ou gera um novo.
func getSessionID(c *fiber.Ctx) string {
	sessionID := strings.TrimSpace(c.Get("X-Session-ID"))
	if sessionID == "" {
		sessionID = uuid.New().String()
	}
	return sessionID
}

// AddToCart adiciona um item ao carrinho.
func AddToCart(c *fiber.Ctx) error {
	var req model.AddToCartRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if strings.TrimSpace(req.StoreID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "store_id é obrigatório"})
	}
	if strings.TrimSpace(req.ProductID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "product_id é obrigatório"})
	}
	if req.Quantity < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity deve ser >= 1"})
	}
	if req.Quantity > 999 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity máximo: 999"})
	}

	sessionID := getSessionID(c)

	cart, err := repository.GetOrCreateCart(sessionID, req.StoreID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao acessar carrinho"})
	}

	item, err := repository.AddToCart(cart.ID, req)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrado") || strings.Contains(err.Error(), "inativo") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		if strings.Contains(err.Error(), "estoque insuficiente") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao adicionar item"})
	}

	c.Set("X-Session-ID", sessionID)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"item":       item,
		"session_id": sessionID,
	})
}

// UpdateCartItem atualiza a quantidade de um item do carrinho.
func UpdateCartItem(c *fiber.Ctx) error {
	storeID := c.Query("store_id")
	if storeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "store_id é obrigatório"})
	}

	itemID := c.Params("id")
	if itemID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id é obrigatório"})
	}

	var req model.UpdateCartItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if req.Quantity < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity deve ser >= 1"})
	}
	if req.Quantity > 999 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity máximo: 999"})
	}

	sessionID := getSessionID(c)
	cart, err := repository.GetCart(sessionID, storeID)
	if err != nil || cart == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "carrinho não encontrado"})
	}

	item, err := repository.UpdateCartItem(cart.ID, itemID, req.Quantity)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrado") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao atualizar item"})
	}

	return c.JSON(item)
}

// RemoveCartItem remove um item do carrinho.
func RemoveCartItem(c *fiber.Ctx) error {
	storeID := c.Query("store_id")
	if storeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "store_id é obrigatório"})
	}

	itemID := c.Params("id")
	if itemID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id é obrigatório"})
	}

	sessionID := getSessionID(c)
	cart, err := repository.GetCart(sessionID, storeID)
	if err != nil || cart == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "carrinho não encontrado"})
	}

	if err := repository.RemoveCartItem(cart.ID, itemID); err != nil {
		if strings.Contains(err.Error(), "não encontrado") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao remover item"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// GetCart retorna o carrinho da sessão.
func GetCart(c *fiber.Ctx) error {
	storeID := c.Query("store_id")
	if storeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "store_id é obrigatório"})
	}

	sessionID := getSessionID(c)
	cart, err := repository.GetCart(sessionID, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao buscar carrinho"})
	}

	if cart == nil {
		return c.JSON(model.CartResponse{
			Cart: model.Cart{
				SessionID: sessionID,
				StoreID:   storeID,
				Items:     []model.CartItem{},
			},
			SubtotalCents: 0,
			ItemCount:     0,
		})
	}

	if cart.Items == nil {
		cart.Items = []model.CartItem{}
	}

	var subtotal int64
	var itemCount int
	for _, item := range cart.Items {
		subtotal += item.UnitPriceCents * int64(item.Quantity)
		itemCount += item.Quantity
	}

	c.Set("X-Session-ID", sessionID)
	return c.JSON(model.CartResponse{
		Cart:          *cart,
		SubtotalCents: subtotal,
		ItemCount:     itemCount,
	})
}
