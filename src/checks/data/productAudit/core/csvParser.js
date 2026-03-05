const { parse } = require("csv-parse/sync");

function parseCSV(csvText) {
  const cleaned = csvText.replace(/^\uFEFF/, "");

  return parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });
}

module.exports = { parseCSV };
