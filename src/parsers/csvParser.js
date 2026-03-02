function parseCSV(text) {
  const lines = text.split("\n").filter(Boolean);

  const isQuoted = lines[0].includes('"');

  const split = isQuoted
    ? (line) => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    : (line) => line.split(",");

  const headers = split(lines[0]).map((h) => h.replace(/"/g, "").trim());

  return lines.slice(1).map((line) => {
    const values = split(line);

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i]?.replace(/"/g, "").trim();
    });

    return obj;
  });
}
module.exports = { parseCSV };
