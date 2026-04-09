-- BKL-143: domínio customizado verificável por loja
-- A coluna domain_custom já existe em lojas (migration 001).
-- Adicionamos os campos de verificação e renomeamos para custom_domain por consistência.

ALTER TABLE lojas
    ADD COLUMN IF NOT EXISTS domain_verified          BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS domain_verification_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS domain_verified_at       TIMESTAMPTZ;

-- Índice único exclui NULLs (lojas sem domínio customizado não conflitam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lojas_domain_custom
    ON lojas(domain_custom)
    WHERE domain_custom IS NOT NULL;
