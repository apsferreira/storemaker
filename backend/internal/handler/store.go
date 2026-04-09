package handler

import (
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/repository"
)

const cnameTarget = "stores.institutoitinerante.com.br"

// SetStoreDomain configura um domínio customizado para a loja.
// PUT /api/v1/stores/:id/domain
func SetStoreDomain(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	// Garante que o dono só edita a própria loja
	if c.Params("id") != storeID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "acesso negado"})
	}

	var req model.SetDomainRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	req.Domain = strings.ToLower(strings.TrimSpace(req.Domain))
	if req.Domain == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "domain é obrigatório"})
	}
	if len(req.Domain) > 255 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "domain não pode exceder 255 caracteres"})
	}
	// Rejeitar domínios internos sendo registrados como customizados
	if strings.HasSuffix(req.Domain, "institutoitinerante.com.br") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "domínio interno não permitido"})
	}

	token := uuid.New().String()

	if err := repository.SetLojaDomain(storeID, req.Domain, token); err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "domínio já está em uso por outra loja"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao configurar domínio"})
	}

	return c.Status(fiber.StatusOK).JSON(model.DomainConfigResponse{
		Domain:            req.Domain,
		VerificationToken: token,
		CNAMETarget:       cnameTarget,
		TXTRecord:         fmt.Sprintf("_iit-verify.%s", req.Domain),
		TXTValue:          fmt.Sprintf("iit-verify=%s", token),
		Instructions: fmt.Sprintf(
			"Adicione dois registros DNS no seu provedor:\n"+
				"1. CNAME: %s → %s\n"+
				"2. TXT:   _iit-verify.%s → iit-verify=%s\n"+
				"Após propagação (até 48h), chame POST /api/v1/stores/%s/domain/verify",
			req.Domain, cnameTarget, req.Domain, token, storeID,
		),
	})
}

// VerifyStoreDomain verifica se o TXT record de DNS foi propagado.
// POST /api/v1/stores/:id/domain/verify
func VerifyStoreDomain(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	if c.Params("id") != storeID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "acesso negado"})
	}

	loja, err := repository.GetLojaByID(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao buscar loja"})
	}
	if loja == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "loja não encontrada"})
	}
	if loja.DomainCustom == nil || *loja.DomainCustom == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "nenhum domínio configurado para verificar"})
	}
	if loja.DomainVerificationToken == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token de verificação ausente — configure o domínio primeiro"})
	}

	domain := *loja.DomainCustom
	expectedToken := fmt.Sprintf("iit-verify=%s", *loja.DomainVerificationToken)
	txtHost := fmt.Sprintf("_iit-verify.%s", domain)

	records, err := net.LookupTXT(txtHost)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.DomainVerifyResponse{
			Verified: false,
			Message:  "DNS não propagado ainda — aguarde e tente novamente",
		})
	}

	for _, r := range records {
		if r == expectedToken {
			now := time.Now().UTC()
			if err := repository.MarkDomainVerified(storeID, now); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao salvar verificação"})
			}
			return c.Status(fiber.StatusOK).JSON(model.DomainVerifyResponse{
				Verified: true,
				Message:  fmt.Sprintf("Domínio %s verificado com sucesso", domain),
			})
		}
	}

	return c.Status(fiber.StatusBadRequest).JSON(model.DomainVerifyResponse{
		Verified: false,
		Message:  fmt.Sprintf("Registro TXT '%s' não encontrado — DNS não propagado ainda", expectedToken),
	})
}

// RemoveStoreDomain remove o domínio customizado da loja.
// DELETE /api/v1/stores/:id/domain
func RemoveStoreDomain(c *fiber.Ctx) error {
	storeID, err := extractStoreID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	if c.Params("id") != storeID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "acesso negado"})
	}

	if err := repository.RemoveLojaDomain(storeID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro ao remover domínio"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "domínio removido com sucesso"})
}
