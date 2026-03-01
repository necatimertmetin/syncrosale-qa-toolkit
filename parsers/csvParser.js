function parseCSV(text) {
  const lines = text.split("\n").filter(Boolean);

  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i]?.replace(/"/g, "").trim();
    });

    return obj;
  });
}

module.exports = { parseCSV };
