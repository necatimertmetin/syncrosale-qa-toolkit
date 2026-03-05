function detectDuplicates(products) {
  const asinMap = new Map();
  const results = [];

  for (const p of products) {
    if (!p.asin) continue;

    if (!asinMap.has(p.asin)) {
      asinMap.set(p.asin, []);
    }

    asinMap.get(p.asin).push(p);
  }

  for (const [asin, list] of asinMap) {
    if (list.length > 1) {
      list.forEach((p) => {
        results.push({
          type: "DUPLICATE_ASIN",
          asin: p.asin,
          sku: p.sku,
        });
      });
    }
  }

  return results;
}

module.exports = { detectDuplicates };
