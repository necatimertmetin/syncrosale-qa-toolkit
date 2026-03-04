module.exports = function counters(rows, summary) {
  summary.accepted = 0;
  summary.shipping = 0;
  summary.cancelled = 0;

  rows.forEach((r) => {
    const status = r.status || "";

    if (status === "ACCEPTED") summary.accepted++;
    if (status.includes("SHIP")) summary.shipping++;
    if (status === "CANCELLED") summary.cancelled++;
  });
};
