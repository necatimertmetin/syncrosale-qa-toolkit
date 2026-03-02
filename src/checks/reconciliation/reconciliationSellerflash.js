const { parseCSV } = require("../../parsers/csvParser");
const { parseAmazonTxt } = require("../../parsers/amazonTxtParser");

const {
  normalizeSellerflashRow,
} = require("../../mappers/sellerflashRow.mapper");
const { normalizeAmazonRow } = require("../../mappers/amazonRow.mapper");

const { buildFlags } = require("./utils/flags");

const { indexByAsin } = require("./core/indexer");
const {
  compare,
  getStockSeverity,
  getPriceSeverity,
} = require("./core/comparator");
const { classify } = require("./core/classifier");

function reconcile(sellerflashCsvText, amazonTxtText) {
  const sellerflashRaw = parseCSV(sellerflashCsvText);
  const amazonRaw = parseAmazonTxt(amazonTxtText);

  // 🔥 NO FILTER
  const sellerflash = sellerflashRaw.map((r) => {
    const n = normalizeSellerflashRow(r);
    return { ...n, flags: buildFlags(n) };
  });

  const amazon = amazonRaw.map((r) => {
    const n = normalizeAmazonRow(r);
    return { ...n, flags: buildFlags(n) };
  });

  const sfMap = indexByAsin(sellerflash);
  const amazonMap = indexByAsin(amazon);

  const allAsins = new Set([...sfMap.keys(), ...amazonMap.keys()]);

  const results = [];

  allAsins.forEach((asin) => {
    const s = sfMap.get(asin);
    const a = amazonMap.get(asin);

    if (!s || !a) {
      results.push({
        asin,
        status: classify(null, s, a),
        sellerflash: s,
        amazon: a,
      });
      return;
    }

    const diff = compare(s, a);
    const status = classify(diff, s, a);

    results.push({
      asin,
      status,
      diff,
      priceSeverity: getPriceSeverity(diff.priceDiff),
      stockSeverity: getStockSeverity(diff.quantityDiff),
      sellerflash: s,
      amazon: a,
    });
  });

  return results;
}

module.exports = { reconcile };
