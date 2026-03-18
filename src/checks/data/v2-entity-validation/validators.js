/**
 * V2 Entity Validation Validators
 * Business logic validators for detected data issues
 */

class ValidationResult {
  constructor(checkName, severity, issues = []) {
    this.checkName = checkName;
    this.severity = severity; // CRITICAL, HIGH, MEDIUM, LOW
    this.issueCount = issues.length;
    this.issues = issues.slice(0, 20); // Show first 20
    this.hasManyMore = issues.length > 20;
    this.totalFound = issues.length;
  }

  toJSON() {
    return {
      checkName: this.checkName,
      severity: this.severity,
      issueCount: this.issueCount,
      issues: this.issues,
      moreIssuesExist: this.hasManyMore,
      totalFound: this.totalFound,
    };
  }
}

class V2EntityValidators {
  // =========================================
  // PRICE VALIDATORS
  // =========================================

  static validatePriceOrder(rows) {
    return new ValidationResult(
      "Price Order Check (min ≤ std ≤ max)",
      "CRITICAL",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        min: r.min_final_price,
        std: r.final_price,
        max: r.max_final_price,
        violation: r.violation_type,
        impact: "Product cannot be listed on Amazon - API will reject",
      }))
    );
  }

  static validatePriceConsistency(rows) {
    return new ValidationResult(
      "Price Component Consistency",
      "HIGH",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        issue: r.inconsistency_type,
        minComponents: {
          cost: r.min_product_cost,
          shipping: r.min_shipping_cost,
        },
        stdComponents: {
          cost: r.product_cost,
          shipping: r.shipping_cost,
        },
        maxComponents: {
          cost: r.max_product_cost,
          shipping: r.max_shipping_cost,
        },
        impact: "Partial/incomplete pricing data - calculation errors",
      }))
    );
  }

  static validateCurrencyConsistency(rows) {
    return new ValidationResult(
      "Currency Consistency Across Price Tiers",
      "HIGH",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        minCurrency: r.min_price_currency,
        stdCurrency: r.price_currency,
        maxCurrency: r.max_price_currency,
        impact: "Currency mixing can cause pricing errors",
      }))
    );
  }

  static validateProfitCalculation(rows) {
    return new ValidationResult(
      "Profit Calculation Correctness",
      "CRITICAL",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        actualProfit: r.profit,
        expectedProfit: r.expected_profit,
        calculation: `${r.final_price} - (${r.product_cost} + ${r.shipping_cost} + ${r.tax})`,
        errorType: r.error_type,
        impact:
          "Profit reports invalid - business decisions based on wrong data",
      }))
    );
  }

  static validateMissingDataFlag(rows) {
    return new ValidationResult(
      "Missing Data Flag Consistency",
      "HIGH",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        missingDataFlag: r.missing_data,
        stock: r.stock,
        price: r.final_price,
        inconsistency: r.inconsistency_type,
        impact: "Data state machine inconsistency - unexpected behavior",
      }))
    );
  }

  static validateStockNonNegative(rows) {
    return new ValidationResult(
      "Stock Cannot Be Negative",
      "CRITICAL",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        stock: r.stock,
        action: r.action,
        deleted: r.deleted,
        impact: "Negative stock can cause Amazon listing errors",
      }))
    );
  }

  static validateActionEnum(rows) {
    return new ValidationResult(
      "Invalid Action Enum Value",
      "MEDIUM",
      rows.map((r) => ({
        product: `${r.seller_id}/${r.store_id}/${r.product_id}`,
        action: r.action,
        impact: "Field contains invalid value - filtering logic may fail",
      }))
    );
  }

  // =========================================
  // FK VALIDATORS
  // =========================================

  static validateMarketplaceProductFK(rows) {
    return new ValidationResult(
      "Marketplace Product Missing Base Product (FK Violation)",
      "CRITICAL",
      rows.map((r) => ({
        marketplaceProductId: r.marketplace_product_id,
        asin: r.asin,
        sellerId: r.seller_id,
        marketplaceId: r.marketplace_id,
        impact: "Orphaned record - data corruption detected",
      }))
    );
  }

  static validateMarketplaceStatus(rows) {
    return new ValidationResult(
      "Invalid Marketplace Product Status",
      "MEDIUM",
      rows.map((r) => ({
        marketplaceProductId: r.marketplace_product_id,
        asin: r.asin,
        status: r.status,
        validValues: ["ACTIVE", "INACTIVE"],
        impact: "Unknown status value - formatting issues",
      }))
    );
  }

  static validateOfferFK(rows) {
    return new ValidationResult(
      "Offer Missing Marketplace Product (FK Violation)",
      "CRITICAL",
      rows.map((r) => ({
        offerId: r.offer_id,
        marketplaceProductId: r.marketplace_product_id,
        price: r.price,
        stock: r.stock,
        impact: "Orphaned offer record - data corruption",
      }))
    );
  }

  static validateOfferPrice(rows) {
    return new ValidationResult(
      "Offer Price Cannot Be Negative",
      "CRITICAL",
      rows.map((r) => ({
        offerId: r.offer_id,
        marketplaceProductId: r.marketplace_product_id,
        price: r.price,
        stock: r.stock,
        impact: "Negative price violates business logic",
      }))
    );
  }

  static validateOfferHandlingDays(rows) {
    return new ValidationResult(
      "Offer Handling Days Order Invalid (min > max)",
      "HIGH",
      rows.map((r) => ({
        offerId: r.offer_id,
        marketplaceProductId: r.marketplace_product_id,
        minHandlingDays: r.min_handling_days,
        maxHandlingDays: r.max_handling_days,
        impact: "Amazon API will reject invalid handling time range",
      }))
    );
  }

  // =========================================
  // PRODUCT DETAIL VALIDATORS
  // =========================================

  static validateProductDetailFK(rows) {
    return new ValidationResult(
      "Product Detail Missing Base Product (FK Violation)",
      "CRITICAL",
      rows.map((r) => ({
        productDetailId: r.product_detail_id,
        asin: r.asin,
        bullets: `${r.bullet1 ? "✓" : "✗"} ${r.bullet2 ? "✓" : "✗"} ${r.bullet3 ? "✓" : "✗"}`,
        impact: "Orphaned product detail - data corruption",
      }))
    );
  }

  static validateProductDetailAllEmpty(rows) {
    return new ValidationResult(
      "Product Detail Has No Bullet Points",
      "HIGH",
      rows.map((r) => ({
        productDetailId: r.product_detail_id,
        asin: r.asin,
        allBulletsCounts: 5,
        filledBullets: 0,
        impact: "Product lacks description - cannot create at Amazon",
      }))
    );
  }

  // =========================================
  // PRODUCT IMAGE VALIDATORS
  // =========================================

  static validateProductImageFK(rows) {
    return new ValidationResult(
      "Product Image Missing Base Product (FK Violation)",
      "CRITICAL",
      rows.map((r) => ({
        productImageId: r.product_image_id,
        asin: r.asin,
        imageUrl: r.image_url,
        rank: r.image_rank,
        impact: "Orphaned image record - data corruption",
      }))
    );
  }

  static validateProductImageDuplicateRank(rows) {
    return new ValidationResult(
      "Duplicate Image Rank for Same ASIN",
      "MEDIUM",
      rows.map((r) => ({
        asin: r.asin,
        imageRank: r.image_rank,
        occurrences: r.count,
        impact: "Image ordering ambiguous - unexpected display order on Amazon",
      }))
    );
  }

  static validateProductImageURL(rows) {
    return new ValidationResult(
      "Invalid Product Image URL Format",
      "MEDIUM",
      rows.map((r) => ({
        productImageId: r.product_image_id,
        asin: r.asin,
        url: r.image_url,
        impact: "Amazon will reject invalid image URL",
      }))
    );
  }

  // =========================================
  // PRODUCT RESTRICTION VALIDATORS
  // =========================================

  static validateProductRestrictionFK(rows) {
    return new ValidationResult(
      "Product Restriction Missing Base Product (FK Violation)",
      "CRITICAL",
      rows.map((r) => ({
        restrictionId: r.restriction_id,
        asin: r.asin,
        restrictionType: r.restriction_type,
        reason: r.reason,
        impact: "Orphaned restriction record - data corruption",
      }))
    );
  }

  // =========================================
  // PRODUCT V2 VALIDATORS
  // =========================================

  static validateProductStatus(rows) {
    return new ValidationResult(
      "Invalid Product Status Enum",
      "MEDIUM",
      rows.map((r) => ({
        asin: r.asin,
        status: r.status,
        validValues: ["CREATED", "ACTIVE", "INACTIVE"],
        impact: "Unknown status - filtering/sync logic may fail",
      }))
    );
  }

  static validateProductDimensions(rows) {
    return new ValidationResult(
      "Dimension Metadata Inconsistency (value without unit or vice versa)",
      "HIGH",
      rows.map((r) => ({
        asin: r.asin,
        errorType: r.dimension_error_type,
        height: r.height_value ? `${r.height_value} ${r.height_unit}` : "N/A",
        length: r.length_value ? `${r.length_value} ${r.length_unit}` : "N/A",
        width: r.width_value ? `${r.width_value} ${r.width_unit}` : "N/A",
        weight: r.weight_value ? `${r.weight_value} ${r.weight_unit}` : "N/A",
        impact: "Product creation will fail - incomplete dimension data",
      }))
    );
  }

  // =========================================
  // STATISTICS
  // =========================================

  static formatEntityCounts(rows) {
    const counts = {};
    rows.forEach((r) => {
      counts[r.table_name] = {
        total: r.total_records,
        active: r.active,
        inactive: r.inactive,
        created: r.created,
      };
    });
    return counts;
  }
}

module.exports = { ValidationResult, V2EntityValidators };
