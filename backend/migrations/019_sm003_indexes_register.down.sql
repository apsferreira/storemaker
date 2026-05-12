-- Rollback SM-003 indexes
DROP INDEX IF EXISTS idx_lojas_owner_id_unique;
DROP INDEX IF EXISTS idx_lojas_slug_lower;
