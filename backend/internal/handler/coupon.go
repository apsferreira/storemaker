package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/repository"
)

// CreateCoupon cria um novo cupom (admin).
func CreateCoupon(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	var req model.CreateCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if err := validateCouponCreate(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))

	coupon, err := repository.CreateCoupon(storeID, req)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "código de cupom já existe nesta loja"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao criar cupom"})
	}

	return c.Status(fiber.StatusCreated).JSON(coupon)
}

// ListCoupons lista cupons da loja (admin).
func ListCoupons(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	coupons, err := repository.ListCoupons(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao listar cupons"})
	}

	if coupons == nil {
		coupons = []model.Coupon{}
	}

	return c.JSON(fiber.Map{"data": coupons})
}

// GetCoupon retorna detalhes de um cupom (admin).
func GetCoupon(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	coupon, err := repository.GetCoupon(storeID, c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao buscar cupom"})
	}
	if coupon == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "cupom não encontrado"})
	}

	return c.JSON(coupon)
}

// UpdateCoupon atualiza um cupom (admin).
func UpdateCoupon(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	var req model.UpdateCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if req.Code != nil {
		upper := strings.ToUpper(strings.TrimSpace(*req.Code))
		req.Code = &upper
	}
	if req.DiscountType != nil {
		dt := strings.ToLower(strings.TrimSpace(*req.DiscountType))
		if dt != "percent" && dt != "fixed" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "discount_type inválido (percent, fixed)",
			})
		}
		req.DiscountType = &dt
	}

	coupon, err := repository.UpdateCoupon(storeID, c.Params("id"), req)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "código já existe"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao atualizar cupom"})
	}
	if coupon == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "cupom não encontrado"})
	}

	return c.JSON(coupon)
}

// DeleteCoupon exclui um cupom (admin).
func DeleteCoupon(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	if err := repository.DeleteCoupon(storeID, c.Params("id")); err != nil {
		if strings.Contains(err.Error(), "não encontrado") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "cupom não encontrado"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao deletar cupom"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ValidateCoupon valida um cupom (público por store).
func ValidateCoupon(c *fiber.Ctx) error {
	var req model.ValidateCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if strings.TrimSpace(req.StoreID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "store_id é obrigatório"})
	}
	if strings.TrimSpace(req.Code) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code é obrigatório"})
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	result, err := repository.ValidateCoupon(req.StoreID, code, req.SubtotalCents)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao validar cupom"})
	}

	return c.JSON(result)
}

func validateCouponCreate(req model.CreateCouponRequest) error {
	if strings.TrimSpace(req.Code) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "code é obrigatório")
	}
	if len(req.Code) > 50 {
		return fiber.NewError(fiber.StatusBadRequest, "code deve ter até 50 caracteres")
	}

	validTypes := map[string]bool{"percent": true, "fixed": true}
	if !validTypes[strings.ToLower(req.DiscountType)] {
		return fiber.NewError(fiber.StatusBadRequest, "discount_type inválido (percent, fixed)")
	}

	if req.DiscountValue < 0 {
		return fiber.NewError(fiber.StatusBadRequest, "discount_value deve ser >= 0")
	}
	if req.DiscountType == "percent" && req.DiscountValue > 100 {
		return fiber.NewError(fiber.StatusBadRequest, "percent deve ser entre 0 e 100")
	}
	if req.MinOrderCents < 0 {
		return fiber.NewError(fiber.StatusBadRequest, "min_order_cents deve ser >= 0")
	}
	if req.MaxUses < 0 {
		return fiber.NewError(fiber.StatusBadRequest, "max_uses deve ser >= 0")
	}

	return nil
}
