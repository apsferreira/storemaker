package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/apsferreira/storemaker/internal/model"
	"github.com/apsferreira/storemaker/internal/pkg/database"
)

// GetLojaByID busca uma loja pelo ID.
func GetLojaByID(lojaID string) (*model.Loja, error) {
	loja := &model.Loja{}
	err := database.DB.QueryRow(
		`SELECT id, owner_id, name, slug, domain_custom,
		        domain_verified, domain_verification_token, domain_verified_at,
		        template, created_at, updated_at
		 FROM lojas
		 WHERE id = $1`,
		lojaID,
	).Scan(
		&loja.ID, &loja.OwnerID, &loja.Name, &loja.Slug, &loja.DomainCustom,
		&loja.DomainVerified, &loja.DomainVerificationToken, &loja.DomainVerifiedAt,
		&loja.Template, &loja.CreatedAt, &loja.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar loja: %w", err)
	}
	return loja, nil
}

// GetLojaByCustomDomain busca uma loja pelo domínio customizado verificado.
func GetLojaByCustomDomain(domain string) (*model.Loja, error) {
	loja := &model.Loja{}
	err := database.DB.QueryRow(
		`SELECT id, owner_id, name, slug, domain_custom,
		        domain_verified, domain_verification_token, domain_verified_at,
		        template, created_at, updated_at
		 FROM lojas
		 WHERE domain_custom = $1
		   AND domain_verified = TRUE`,
		domain,
	).Scan(
		&loja.ID, &loja.OwnerID, &loja.Name, &loja.Slug, &loja.DomainCustom,
		&loja.DomainVerified, &loja.DomainVerificationToken, &loja.DomainVerifiedAt,
		&loja.Template, &loja.CreatedAt, &loja.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar loja por domínio: %w", err)
	}
	return loja, nil
}

// SetLojaDomain configura o domínio customizado e gera token de verificação.
func SetLojaDomain(lojaID, domain, token string) error {
	_, err := database.DB.Exec(
		`UPDATE lojas
		 SET domain_custom = $1,
		     domain_verification_token = $2,
		     domain_verified = FALSE,
		     domain_verified_at = NULL,
		     updated_at = NOW()
		 WHERE id = $3`,
		domain, token, lojaID,
	)
	return err
}

// MarkDomainVerified marca o domínio como verificado.
func MarkDomainVerified(lojaID string, verifiedAt time.Time) error {
	_, err := database.DB.Exec(
		`UPDATE lojas
		 SET domain_verified = TRUE,
		     domain_verified_at = $1,
		     updated_at = NOW()
		 WHERE id = $2`,
		verifiedAt, lojaID,
	)
	return err
}

// RemoveLojaDomain remove o domínio customizado da loja.
func RemoveLojaDomain(lojaID string) error {
	_, err := database.DB.Exec(
		`UPDATE lojas
		 SET domain_custom = NULL,
		     domain_verification_token = NULL,
		     domain_verified = FALSE,
		     domain_verified_at = NULL,
		     updated_at = NOW()
		 WHERE id = $1`,
		lojaID,
	)
	return err
}
