-- Supabase PostgreSQL Schema for INE Product Price Tracker (Phase 2)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- TABLE 1: tracked_products
-- Purpose: Store products that the user has chosen to track.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tracked_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL UNIQUE,
    external_product_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quickly querying active tracked products
CREATE INDEX IF NOT EXISTS idx_tracked_products_is_active ON tracked_products (is_active);


-- -----------------------------------------------------------------------------
-- TABLE 2: price_history
-- Purpose: Store only VALID successful scrape results.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    stock TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieving price history for a product ordered by timestamp descending
CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON price_history (product_id, scraped_at DESC);


-- -----------------------------------------------------------------------------
-- TABLE 3: scrape_logs
-- Purpose: Record every scrape attempt honestly (success, retrying, failed).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'retrying', 'failed')),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieving scrape logs for a product ordered by timestamp descending
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_time ON scrape_logs (product_id, created_at DESC);
