function toNumber(val) {
  if (val === null || val === undefined) return 0;

  const cleaned = String(val)
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanString(val) {
  return String(val || "")
    .trim()
    .toUpperCase();
}

module.exports = { toNumber, cleanString };
