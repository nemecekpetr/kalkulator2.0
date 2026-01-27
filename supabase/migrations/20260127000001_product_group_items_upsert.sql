-- Function for atomic update of product group items
-- Deletes existing items and inserts new ones in a single transaction

CREATE OR REPLACE FUNCTION update_product_group_items(
  p_group_id UUID,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing items for this group
  DELETE FROM product_group_items WHERE group_id = p_group_id;

  -- Insert new items if provided
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO product_group_items (group_id, product_id, quantity, sort_order)
    SELECT
      p_group_id,
      (item->>'product_id')::UUID,
      COALESCE((item->>'quantity')::INTEGER, 1),
      (item->>'sort_order')::INTEGER
    FROM jsonb_array_elements(p_items) AS item;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_product_group_items(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_group_items(UUID, JSONB) TO service_role;
