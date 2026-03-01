function parseAmazonTxt(text) {
  const lines = text.split("\n").filter(Boolean);
  const headers = lines[0].split("\t");

  return lines.slice(1).map((line) => {
    const values = line.split("\t");

    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i];
    });

    return obj;
  });
}

module.exports = { parseAmazonTxt };
