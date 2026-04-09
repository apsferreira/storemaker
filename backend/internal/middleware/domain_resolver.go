package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/apsferreira/storemaker/internal/repository"
)

// DomainResolver resolve a loja pelo domínio customizado quando o request
// chega de um host externo (não *.institutoitinerante.com.br).
// Injeta resolved_store_id e resolved_owner_id em c.Locals para uso downstream.
// Não bloqueia a requisição: se o domínio não corresponder a nenhuma loja,
// o handler downstream receberá Locals vazios.
func DomainResolver() fiber.Handler {
	return func(c *fiber.Ctx) error {
		host := c.Hostname()

		// Ignorar porta se presente (ex: localhost:3001)
		if idx := strings.LastIndex(host, ":"); idx != -1 {
			host = host[:idx]
		}

		// Domínios internos e localhost não são resolvidos por este middleware
		if host == "localhost" ||
			strings.HasSuffix(host, ".institutoitinerante.com.br") ||
			strings.HasSuffix(host, ".cluster.local") {
			return c.Next()
		}

		loja, err := repository.GetLojaByCustomDomain(host)
		if err != nil || loja == nil {
			// Não bloquear — loja não encontrada ou erro de banco
			return c.Next()
		}

		c.Locals("resolved_store_id", loja.ID)
		c.Locals("resolved_owner_id", loja.OwnerID)
		return c.Next()
	}
}
