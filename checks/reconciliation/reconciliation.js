const { parseCSV } = require("./parsers/csvParser");
const { parseAmazonTxt } = require("./parsers/amazonTxtParser");

const { normalizeSyncroRow } = require("./normalizers/syncroNormalizer");
const { normalizeAmazonRow } = require("./normalizers/amazonNormalizer");

const { buildFlags } = require("./utils/flags");

const { indexByAsin } = require("./core/indexer");
const { compare } = require("./core/comparator");
const { classify } = require("./core/classifier");

function reconcile(syncroCsvText, amazonTxtText) {
  const syncroRaw = parseCSV(syncroCsvText);
  const amazonRaw = parseAmazonTxt(amazonTxtText);

  const syncro = syncroRaw.map((r) => {
    const n = normalizeSyncroRow(r);
    return { ...n, flags: buildFlags(n) };
  });

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

    results.push({
      asin,
      status,
      diff,
      syncro: s,
      amazon: a,
    });
  });

  return results;
}

module.exports = { reconcile };
