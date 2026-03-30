ALTER TABLE cupons
    DROP COLUMN IF EXISTS discount_type,
    DROP COLUMN IF EXISTS discount_value,
    DROP COLUMN IF EXISTS min_order_cents;
