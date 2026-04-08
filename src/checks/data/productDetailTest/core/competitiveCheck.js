/**
 * Competitive Check — validates marketplace & BuyBox data consistency.
 *
 * Checks:
 *  - buyBoxWinner flag vs actual offers data
 *  - lowestPrice flag vs lowestPriceAmount
 *  - offerCount mismatch between root and marketplace
 *  - FBA competition presence flagging
 *  - China shipping risk flag
 */

function runCompetitiveCheck(detail) {
  if (!detail) return [];
  const {
    asin,
    buyBoxWinner,
    lowestPrice,
    offerCount,
    price,
    marketplaceProduct,
  } = detail;
  const results = [];

  if (!marketplaceProduct) return results;

  // BuyBox winner inconsistency
  if (buyBoxWinner === true && marketplaceProduct.offers?.length) {
    const actualWinner = marketplaceProduct.offers.find(
      (o) => o.isBuyBoxWinner === true,
    );
    if (!actualWinner) {
      results.push({
        type: "BUYBOX_WINNER_NO_OFFER_MATCH",
        severity: "MEDIUM",
        asin,
        message: "buyBoxWinner=true but no offer has isBuyBoxWinner=true",
      });
    }
  }

  // Lowest price flag inconsistency
  if (
    lowestPrice === true &&
    price?.finalPrice != null &&
    marketplaceProduct.lowestPriceAmount != null
  ) {
    if (price.finalPrice > marketplaceProduct.lowestPriceAmount * 1.02) {
      results.push({
        type: "LOWEST_PRICE_FLAG_MISMATCH",
        severity: "MEDIUM",
        asin,
        ourPrice: price.finalPrice,
        marketLowest: marketplaceProduct.lowestPriceAmount,
      });
    }
  }

  // Offer count mismatch
  if (offerCount != null && marketplaceProduct.totalOfferCount != null) {
    if (offerCount !== marketplaceProduct.totalOfferCount) {
      results.push({
        type: "OFFER_COUNT_MISMATCH",
        severity: "LOW",
        asin,
        rootOfferCount: offerCount,
        marketplaceOfferCount: marketplaceProduct.totalOfferCount,
      });
    }
  }

  // FBA competition
  if (marketplaceProduct.hasFBASeller === true) {
    results.push({
      type: "FBA_COMPETITION_PRESENT",
      severity: "INFO",
      asin,
    });
  }

  // China shipping risk
  if (marketplaceProduct.hasShipFromChina === true) {
    results.push({
      type: "CHINA_SHIPPING_RISK",
      severity: "INFO",
      asin,
    });
  }

  return results;
}

module.exports = { runCompetitiveCheck };
