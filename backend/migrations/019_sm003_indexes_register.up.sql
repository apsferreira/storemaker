-- Migration 019: SM-003 — índices de suporte ao fluxo de registro de lojistas

-- Índice para lookup de loja por owner (usado no Register para verificar conta existente)
CREATE INDEX IF NOT EXISTS idx_lojas_owner_id_unique ON lojas(owner_id);

-- Índice de slug (case-insensitive) para check-slug rápido
CREATE UNIQUE INDEX IF NOT EXISTS idx_lojas_slug_lower ON lojas(LOWER(slug));

COMMENT ON INDEX idx_lojas_owner_id_unique IS 'SM-003: Lookup de loja por owner_id no fluxo de registro';
COMMENT ON INDEX idx_lojas_slug_lower IS 'SM-003: Check de slug case-insensitive para validação no cadastro';
