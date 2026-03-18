/**
 * V2 Entity Validation Queries
 * Read-only queries to detect bugs in V2 entities
 */

const QUERIES = {
  // ============================================
  // STORE PRODUCT PRICE V2 - Price Checks
  // ============================================

  PRICE_ORDER_VIOLATIONS: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      min_final_price,
      final_price,
      max_final_price,
      CASE 
        WHEN min_final_price > final_price THEN 'min > std'
        WHEN final_price > max_final_price THEN 'std > max'
        WHEN min_final_price > max_final_price THEN 'min > max'
        ELSE 'CRITICAL'
      END as violation_type
    FROM sync_store_product_price_v2
    WHERE deleted = false
      AND (min_final_price > final_price 
           OR final_price > max_final_price 
           OR min_final_price > max_final_price)
    ORDER BY seller_id, store_id
    LIMIT 1000;
  `,

  PRICE_CONSISTENCY_NULLS: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      CASE 
        WHEN (min_product_cost IS NULL AND min_shipping_cost IS NOT NULL) THEN 'incomplete_min'
        WHEN (product_cost IS NULL AND shipping_cost IS NOT NULL) THEN 'incomplete_std'
        WHEN (max_product_cost IS NULL AND max_shipping_cost IS NOT NULL) THEN 'incomplete_max'
        WHEN (min_final_price IS NULL AND final_price IS NOT NULL) THEN 'mixed_null_price'
      END as inconsistency_type,
      min_product_cost, min_shipping_cost, min_final_price,
      product_cost, shipping_cost, final_price,
      max_product_cost, max_shipping_cost, max_final_price
    FROM sync_store_product_price_v2
    WHERE deleted = false
      AND (
        (min_product_cost IS NULL AND min_shipping_cost IS NOT NULL)
        OR (product_cost IS NULL AND shipping_cost IS NOT NULL)
        OR (max_product_cost IS NULL AND max_shipping_cost IS NOT NULL)
        OR (min_final_price IS NULL AND final_price IS NOT NULL)
      )
    LIMIT 500;
  `,

  CURRENCY_MISMATCH: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      min_price_currency,
      price_currency,
      max_price_currency
    FROM sync_store_product_price_v2
    WHERE deleted = false
      AND (min_price_currency != price_currency 
           OR price_currency != max_price_currency)
    LIMIT 500;
  `,

  PROFIT_CALCULATION_ERRORS: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      final_price,
      product_cost,
      shipping_cost,
      tax,
      profit,
      (final_price - COALESCE(product_cost, 0) - COALESCE(shipping_cost, 0) - COALESCE(tax, 0)) as expected_profit,
      CASE 
        WHEN profit != (final_price - COALESCE(product_cost, 0) - COALESCE(shipping_cost, 0) - COALESCE(tax, 0)) THEN 'mismatch'
        WHEN profit < 0 AND action = 'ALLOW' THEN 'negative_profit_allowed'
      END as error_type
    FROM sync_store_product_price_v2
    WHERE deleted = false
      AND profit != (final_price - COALESCE(product_cost, 0) - COALESCE(shipping_cost, 0) - COALESCE(tax, 0))
    LIMIT 500;
  `,

  MISSING_DATA_INCONSISTENCY: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      missing_data,
      stock,
      final_price,
      min_final_price,
      max_final_price,
      CASE 
        WHEN missing_data = true AND stock > 0 THEN 'stock_with_missing_data'
        WHEN missing_data = true AND (final_price > 0 OR min_final_price > 0 OR max_final_price > 0) THEN 'prices_with_missing_data'
        WHEN missing_data = false AND stock = 0 AND final_price = 0 AND action IS NULL THEN 'possible_missing_data_flag'
      END as inconsistency_type
    FROM sync_store_product_price_v2
    WHERE deleted = false
      AND (
        (missing_data = true AND stock > 0)
        OR (missing_data = true AND (final_price > 0 OR min_final_price > 0 OR max_final_price > 0))
        OR (missing_data = false AND stock = 0 AND final_price = 0 AND action IS NULL)
      )
    LIMIT 500;
  `,

  STOCK_NEGATIVE: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      stock,
      action,
      deleted
    FROM sync_store_product_price_v2
    WHERE stock < 0
    LIMIT 500;
  `,

  INVALID_ACTION_ENUM: `
    SELECT 
      seller_id,
      store_id,
      product_id,
      action
    FROM sync_store_product_price_v2
    WHERE action IS NOT NULL 
      AND action NOT IN ('ALLOW', 'BLOCK', 'REVIEW')
    LIMIT 500;
  `,

  // ============================================
  // MARKETPLACE PRODUCT V2 - FK & Status Checks
  // ============================================

  MARKETPLACE_MISSING_PRODUCT: `
    SELECT 
      m.marketplace_product_id,
      m.asin,
      m.seller_id,
      m.marketplace_id
    FROM sync_marketplace_product_v2 m
    LEFT JOIN sync_product_v2 p ON m.asin = p.asin
    WHERE p.asin IS NULL
    LIMIT 500;
  `,

  MARKETPLACE_INVALID_STATUS: `
    SELECT 
      marketplace_product_id,
      asin,
      seller_id,
      status
    FROM sync_marketplace_product_v2
    WHERE status IS NOT NULL 
      AND status NOT IN ('ACTIVE', 'INACTIVE')
    LIMIT 500;
  `,

  // ============================================
  // MARKETPLACE OFFER V2 - Offer Checks
  // ============================================

  OFFER_MISSING_MARKETPLACE_PRODUCT: `
    SELECT 
      o.offer_id,
      o.marketplace_product_id,
      o.price,
      o.stock
    FROM sync_marketplace_product_offer_v2 o
    LEFT JOIN sync_marketplace_product_v2 m ON o.marketplace_product_id = m.marketplace_product_id
    WHERE m.marketplace_product_id IS NULL
    LIMIT 500;
  `,

  OFFER_PRICE_NEGATIVE: `
    SELECT 
      offer_id,
      marketplace_product_id,
      price,
      stock
    FROM sync_marketplace_product_offer_v2
    WHERE price < 0
    LIMIT 500;
  `,

  OFFER_HANDLING_DAYS_INVALID: `
    SELECT 
      offer_id,
      marketplace_product_id,
      min_handling_days,
      max_handling_days
    FROM sync_marketplace_product_offer_v2
    WHERE min_handling_days > max_handling_days
    LIMIT 500;
  `,

  // ============================================
  // PRODUCT DETAIL V2
  // ============================================

  PRODUCT_DETAIL_MISSING_ASIN: `
    SELECT 
      product_detail_id,
      asin,
      bullet1,
      bullet2,
      bullet3
    FROM sync_product_detail_v2 d
    LEFT JOIN sync_product_v2 p ON d.asin = p.asin
    WHERE p.asin IS NULL
    LIMIT 500;
  `,

  PRODUCT_DETAIL_ALL_BULLETS_EMPTY: `
    SELECT 
      product_detail_id,
      asin,
      bullet1,
      bullet2,
      bullet3,
      bullet4,
      bullet5
    FROM sync_product_detail_v2
    WHERE (bullet1 IS NULL OR TRIM(bullet1) = '')
      AND (bullet2 IS NULL OR TRIM(bullet2) = '')
      AND (bullet3 IS NULL OR TRIM(bullet3) = '')
      AND (bullet4 IS NULL OR TRIM(bullet4) = '')
      AND (bullet5 IS NULL OR TRIM(bullet5) = '')
    LIMIT 500;
  `,

  // ============================================
  // PRODUCT IMAGE V2
  // ============================================

  PRODUCT_IMAGE_MISSING_ASIN: `
    SELECT 
      product_image_id,
      asin,
      image_url,
      image_rank
    FROM sync_product_image_v2 i
    LEFT JOIN sync_product_v2 p ON i.asin = p.asin
    WHERE p.asin IS NULL
    LIMIT 500;
  `,

  PRODUCT_IMAGE_DUPLICATE_RANK: `
    SELECT 
      asin,
      image_rank,
      COUNT(*) as count
    FROM sync_product_image_v2
    WHERE deleted = false
    GROUP BY asin, image_rank
    HAVING COUNT(*) > 1
    LIMIT 500;
  `,

  PRODUCT_IMAGE_INVALID_URL: `
    SELECT 
      product_image_id,
      asin,
      image_url
    FROM sync_product_image_v2
    WHERE deleted = false
      AND (image_url IS NULL 
           OR image_url NOT LIKE 'http://%' 
           OR image_url NOT LIKE 'https://%')
    LIMIT 500;
  `,

  // ============================================
  // PRODUCT RESTRICTION V2
  // ============================================

  PRODUCT_RESTRICTION_MISSING_ASIN: `
    SELECT 
      restriction_id,
      asin,
      restriction_type,
      reason
    FROM sync_product_restriction_v2 r
    LEFT JOIN sync_product_v2 p ON r.asin = p.asin
    WHERE p.asin IS NULL
    LIMIT 500;
  `,

  // ============================================
  // PRODUCT V2 - Status & Dimension Checks
  // ============================================

  PRODUCT_INVALID_STATUS: `
    SELECT 
      asin,
      status
    FROM sync_product_v2
    WHERE status IS NOT NULL 
      AND status NOT IN ('CREATED', 'ACTIVE', 'INACTIVE')
    LIMIT 500;
  `,

  PRODUCT_DIMENSION_MISMATCH: `
    SELECT 
      asin,
      CASE 
        WHEN height_value IS NOT NULL AND height_unit IS NULL THEN 'missing_height_unit'
        WHEN height_value IS NULL AND height_unit IS NOT NULL THEN 'height_value_without_unit'
        WHEN length_value IS NOT NULL AND length_unit IS NULL THEN 'missing_length_unit'
        WHEN length_value IS NULL AND length_unit IS NOT NULL THEN 'length_value_without_unit'
        WHEN width_value IS NOT NULL AND width_unit IS NULL THEN 'missing_width_unit'
        WHEN width_value IS NULL AND width_unit IS NOT NULL THEN 'width_value_without_unit'
        WHEN weight_value IS NOT NULL AND weight_unit IS NULL THEN 'missing_weight_unit'
        WHEN weight_value IS NULL AND weight_unit IS NOT NULL THEN 'weight_value_without_unit'
      END as dimension_error_type,
      height_value, height_unit,
      length_value, length_unit,
      width_value, width_unit,
      weight_value, weight_unit
    FROM sync_product_v2
    WHERE (height_value IS NOT NULL AND height_unit IS NULL)
       OR (height_value IS NULL AND height_unit IS NOT NULL)
       OR (length_value IS NOT NULL AND length_unit IS NULL)
       OR (length_value IS NULL AND length_unit IS NOT NULL)
       OR (width_value IS NOT NULL AND width_unit IS NULL)
       OR (width_value IS NULL AND width_unit IS NOT NULL)
       OR (weight_value IS NOT NULL AND weight_unit IS NULL)
       OR (weight_value IS NULL AND weight_unit IS NOT NULL)
    LIMIT 500;
  `,

  // ============================================
  // SUMMARY & STATISTICS
  // ============================================

  ENTITY_COUNTS: `
    SELECT 
      'sync_product_v2' as table_name,
      COUNT(*) as total_records,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive,
      SUM(CASE WHEN status = 'CREATED' THEN 1 ELSE 0 END) as created
    FROM sync_product_v2
    UNION ALL
    SELECT 
      'sync_marketplace_product_v2',
      COUNT(*),
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END),
      SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END),
      0
    FROM sync_marketplace_product_v2
    UNION ALL
    SELECT 
      'sync_store_product_price_v2',
      COUNT(*),
      SUM(CASE WHEN deleted = false THEN 1 ELSE 0 END),
      SUM(CASE WHEN deleted = true THEN 1 ELSE 0 END),
      SUM(CASE WHEN missing_data = true THEN 1 ELSE 0 END)
    FROM sync_store_product_price_v2
    UNION ALL
    SELECT 
      'sync_marketplace_product_offer_v2',
      COUNT(*),
      NULL,
      NULL,
      NULL
    FROM sync_marketplace_product_offer_v2
    UNION ALL
    SELECT 
      'sync_product_detail_v2',
      COUNT(*),
      NULL,
      NULL,
      NULL
    FROM sync_product_detail_v2
    UNION ALL
    SELECT 
      'sync_product_image_v2',
      COUNT(*),
      SUM(CASE WHEN deleted = false THEN 1 ELSE 0 END),
      SUM(CASE WHEN deleted = true THEN 1 ELSE 0 END),
      NULL
    FROM sync_product_image_v2
    UNION ALL
    SELECT 
      'sync_product_restriction_v2',
      COUNT(*),
      NULL,
      NULL,
      NULL
    FROM sync_product_restriction_v2;
  `,
};

module.exports = { QUERIES };
