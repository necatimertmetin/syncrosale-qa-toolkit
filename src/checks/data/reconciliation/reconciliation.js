const { parseCSV } = require("../../../parsers/csvParser");
const { parseAmazonTxt } = require("../../../parsers/amazonTxtParser");

const { normalizeSyncroRow } = require("../../../mappers/syncroRow.mapper");
const { normalizeAmazonRow } = require("../../../mappers/amazonRow.mapper");

const { buildFlags } = require("./utils/flags");

const { indexByAsin } = require("./core/indexer");
const {
  compare,
  getStockSeverity,
  getPriceSeverity,
} = require("./core/comparator");
const { classify } = require("./core/classifier");

const ACTIVE_STATUSES = ["ACTIVE"];

function reconcile(syncroCsvText, amazonTxtText) {
  const syncroRaw = parseCSV(syncroCsvText);
  const amazonRaw = parseAmazonTxt(amazonTxtText);

  const syncro = syncroRaw
    .map((r) => {
      const n = normalizeSyncroRow(r);
      return { ...n, flags: buildFlags(n) };
    })
    .filter((item) => ACTIVE_STATUSES.includes(item.storeProductStatus));

  const excludedCount = syncroRaw.length - syncro.length;
  console.log(`⚠️ Filtered out ${excludedCount} non-active products`);

  const amazon = amazonRaw.map((r) => {
    const n = normalizeAmazonRow(r);
    return { ...n, flags: buildFlags(n) };
  });

  const syncroMap = indexByAsin(syncro);
  const amazonMap = indexByAsin(amazon);

  const allAsins = new Set([...syncroMap.keys(), ...amazonMap.keys()]);

  const results = [];

  allAsins.forEach((asin) => {
    const s = syncroMap.get(asin);
    const a = amazonMap.get(asin);

    if (!s || !a) {
      results.push({
        asin,
        status: classify(null, s, a),
        syncro: s,
        amazon: a,
      });
      return;
    }

    const diff = compare(s, a);
    const status = classify(diff, s, a);

    const priceSeverity = getPriceSeverity(diff.priceDiff);
    const stockSeverity = getStockSeverity(diff.quantityDiff);

    results.push({
      asin,
      status,
      diff,
      priceSeverity,
      stockSeverity,
      syncro: s,
      amazon: a,
    });
  });

  const syncroTotal = syncroMap.size;
  const amazonTotal = amazonMap.size;

  let syncroMatchedInAmazon = 0;

  syncroMap.forEach((_, asin) => {
    if (amazonMap.has(asin)) {
      syncroMatchedInAmazon++;
    }
  });

  const coverageRate =
    syncroTotal > 0
      ? ((syncroMatchedInAmazon / syncroTotal) * 100).toFixed(2) + "%"
      : "0%";

  return {
    results,
    metrics: {
      syncroTotal,
      amazonTotal,
      syncroMatchedInAmazon,
      coverageRate,
    },
  };
}

module.exports = { reconcile };
