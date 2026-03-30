ALTER TABLE cupons
    ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
    ADD COLUMN IF NOT EXISTS discount_value BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_order_cents BIGINT NOT NULL DEFAULT 0;

-- Migrar dados existentes: copiar discount_percent para discount_value
UPDATE cupons SET discount_value = discount_percent WHERE discount_percent > 0;
