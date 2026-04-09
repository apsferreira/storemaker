package model

import "time"

// Loja representa uma loja no sistema StoreMake.
type Loja struct {
	ID                      string     `json:"id"`
	OwnerID                 string     `json:"owner_id"`
	Name                    string     `json:"name"`
	Slug                    string     `json:"slug"`
	DomainCustom            *string    `json:"domain_custom,omitempty"`
	DomainVerified          bool       `json:"domain_verified"`
	DomainVerificationToken *string    `json:"domain_verification_token,omitempty"`
	DomainVerifiedAt        *time.Time `json:"domain_verified_at,omitempty"`
	Template                string     `json:"template"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

// SetDomainRequest é o payload para configurar um domínio customizado.
type SetDomainRequest struct {
	Domain string `json:"domain" validate:"required,max=255,hostname"`
}

// DomainConfigResponse retorna o domínio configurado e as instruções de DNS.
type DomainConfigResponse struct {
	Domain            string `json:"domain"`
	VerificationToken string `json:"verification_token"`
	CNAMETarget       string `json:"cname_target"`
	TXTRecord         string `json:"txt_record"`
	TXTValue          string `json:"txt_value"`
	Instructions      string `json:"instructions"`
}

// DomainVerifyResponse retorna o resultado da verificação DNS.
type DomainVerifyResponse struct {
	Verified bool   `json:"verified"`
	Message  string `json:"message"`
}
