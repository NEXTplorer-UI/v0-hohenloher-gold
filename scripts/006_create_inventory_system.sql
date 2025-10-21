-- ============================================================================
-- Inventory Management System
-- ============================================================================
-- Tracks all stock movements with full audit trail and DSGVO compliance
-- Supports both manual movements (by admins) and automatic movements (from orders)

-- ============================================================================
-- Main inventory_movements table
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Product reference (required)
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Order references (optional - only for automatic movements from orders)
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
    order_item_id UUID REFERENCES order_items(id) ON DELETE RESTRICT,
    
    -- Movement details
    qty INTEGER NOT NULL CHECK (qty <> 0),  -- Signed: positive = in, negative = out
    reason TEXT NOT NULL,
    reference_id TEXT,  -- External reference (invoice, delivery note, etc.)
    
    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),  -- When it actually happened
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),   -- When it was recorded
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = system/automatic
    
    -- Auto-computed source field
    source TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN order_id IS NOT NULL OR order_item_id IS NOT NULL THEN 'order'
            WHEN created_by IS NOT NULL THEN 'manual'
            ELSE 'system'
        END
    ) STORED,
    
    -- Constraints
    CONSTRAINT valid_order_reference CHECK (
        -- Either order_id OR order_item_id, not both
        (order_id IS NULL AND order_item_id IS NULL) OR
        (order_id IS NOT NULL AND order_item_id IS NULL) OR
        (order_id IS NULL AND order_item_id IS NOT NULL)
    ),
    CONSTRAINT valid_order_qty CHECK (
        -- Orders must have negative qty (stock out)
        (order_id IS NULL AND order_item_id IS NULL) OR qty < 0
    ),
    CONSTRAINT valid_manual_movement CHECK (
        -- Manual movements must have created_by
        created_by IS NOT NULL OR order_id IS NOT NULL OR order_item_id IS NOT NULL
    )
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred_at ON inventory_movements(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

-- Partial indexes for specific queries
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_item ON inventory_movements(order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_manual ON inventory_movements(created_by) WHERE created_by IS NOT NULL;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_inventory_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_movements_updated_at
    BEFORE UPDATE ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_movements_updated_at();

-- ============================================================================
-- View with product details
-- ============================================================================
CREATE OR REPLACE VIEW inventory_movements_with_details AS
SELECT 
    im.*,
    p.name as product_name,
    p.unit as product_unit,
    c.name as category_name,
    COALESCE(pr.email, 'System') as created_by_email
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN auth.users u ON im.created_by = u.id
LEFT JOIN profiles pr ON u.id = pr.id;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Read: All authenticated users can view movements
CREATE POLICY "inventory_movements_select" ON inventory_movements
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert manual movements: Only admins with their own user_id
CREATE POLICY "inventory_movements_insert_manual" ON inventory_movements
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND
        order_id IS NULL AND
        order_item_id IS NULL
    );

-- Insert automatic movements: Only service_role (from order processing)
CREATE POLICY "inventory_movements_insert_automatic" ON inventory_movements
    FOR INSERT
    TO service_role
    WITH CHECK (
        (order_id IS NOT NULL OR order_item_id IS NOT NULL) AND
        created_by IS NULL
    );

-- Update: Only admins can update their own manual movements
CREATE POLICY "inventory_movements_update" ON inventory_movements
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid() AND
        order_id IS NULL AND
        order_item_id IS NULL
    )
    WITH CHECK (
        created_by = auth.uid() AND
        order_id IS NULL AND
        order_item_id IS NULL
    );

-- Delete: Only admins can delete their own manual movements
CREATE POLICY "inventory_movements_delete" ON inventory_movements
    FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid() AND
        order_id IS NULL AND
        order_item_id IS NULL
    );

-- ============================================================================
-- Helper function to get current stock for a product
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_stock(p_product_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT COALESCE(SUM(qty), 0)
    INTO current_stock
    FROM inventory_movements
    WHERE product_id = p_product_id;
    
    RETURN GREATEST(current_stock, 0);  -- Never return negative
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Helper function to get stock at a specific date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_stock_at_date(p_product_id BIGINT, p_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
    stock_at_date INTEGER;
BEGIN
    SELECT COALESCE(SUM(qty), 0)
    INTO stock_at_date
    FROM inventory_movements
    WHERE product_id = p_product_id
    AND occurred_at <= p_date;
    
    RETURN GREATEST(stock_at_date, 0);  -- Never return negative
END;
$$ LANGUAGE plpgsql STABLE;
