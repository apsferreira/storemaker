ALTER TABLE pedidos
    DROP COLUMN IF EXISTS customer_name,
    DROP COLUMN IF EXISTS customer_email,
    DROP COLUMN IF EXISTS customer_phone;
