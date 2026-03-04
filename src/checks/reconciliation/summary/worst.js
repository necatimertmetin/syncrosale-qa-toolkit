function findWorst(results) {
  const score = (r) => {
    if (!r.diff) return 0;

    const price = Math.abs(r.diff.priceDiff || 0);
    const stock = Math.abs(r.diff.quantityDiff || 0);

    return price + stock * 2;
  };

  return results
    .filter((r) => r.diff)
    .map((r) => ({ ...r, score: score(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

module.exports = { findWorst };
