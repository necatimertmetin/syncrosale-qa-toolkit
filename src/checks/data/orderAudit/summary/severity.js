module.exports = function severity(rows, summary) {
  const levels = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  rows.forEach((r) => {
    const profit = r.profit;

    if (profit == null) return;

    if (profit < 0) {
      const abs = Math.abs(profit);

      if (abs >= 10) levels.CRITICAL++;
      else if (abs >= 5) levels.HIGH++;
      else if (abs >= 1) levels.MEDIUM++;
      else levels.LOW++;
    }
  });

  summary.severity_LOW = levels.LOW;
  summary.severity_MEDIUM = levels.MEDIUM;
  summary.severity_HIGH = levels.HIGH;
  summary.severity_CRITICAL = levels.CRITICAL;
};
