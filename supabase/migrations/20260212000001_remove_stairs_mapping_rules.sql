-- Remove stairs mapping rules - stairs are now handled exclusively via set addons
DELETE FROM product_mapping_rules WHERE config_field = 'stairs';
