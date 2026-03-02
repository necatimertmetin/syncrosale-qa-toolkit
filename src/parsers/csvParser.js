const { parse } = require("csv-parse/sync");

function parseCSV(text) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });
}

module.exports = { parseCSV };
