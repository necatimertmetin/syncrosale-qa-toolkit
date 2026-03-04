const counters = require("./counters");
const stats = require("./stats");
const financials = require("./financials");
const margins = require("./margins");
const commissions = require("./commissions");
const refunds = require("./refunds");
const lifecycle = require("./lifecycle");
const shipping = require("./shipping");
const desi = require("./desi");
const anomalies = require("./anomalies");
const severity = require("./severity");
const health = require("./health");
const worst = require("./worst");

function buildSummary(rows) {
  const summary = {
    type: "SUMMARY",
    total: rows.length,
  };

  counters(rows, summary);
  stats(rows, summary);
  financials(rows, summary);
  margins(rows, summary);
  commissions(rows, summary);
  refunds(rows, summary);
  lifecycle(rows, summary);
  shipping(rows, summary);
  desi(rows, summary);
  anomalies(rows, summary);
  severity(rows, summary);
  health(summary);
  worst(rows, summary);

  return summary;
}

module.exports = { buildSummary };
