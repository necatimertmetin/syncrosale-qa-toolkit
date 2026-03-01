const { parseCSV } = require("../../parsers/csvParser");
const { normalizeSyncroRow } = require("../../mappers/syncroRow.mapper");

function findBuyableButNotActive(csvText) {
  const rows = parseCSV(csvText).map(normalizeSyncroRow);

  const anomalies = rows.filter(
    (r) => r.amazonStatus === "BUYABLE" && r.status !== "ACTIVE",
  );

  return anomalies;
}

module.exports = { findBuyableButNotActive };
