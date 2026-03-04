function getField(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

function isEqual(a, b, tolerance = 0.01) {
  return Math.abs(a - b) < tolerance;
}

module.exports = { getField, isEqual };
