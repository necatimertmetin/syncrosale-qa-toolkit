const { PRODUCT_PATH, STORE_ID } = require("../config");
const { getWithAuth } = require("../api");

// Benign: sadece edge-case / invalid format (SQLi/XSS yok)
const payloads = [
  "", // empty
  " ", // whitespace
  "____", // weird
  "A".repeat(512), // long
  "b0clpm6gqd", // known good (control)
  "B0CLPM6GQD", // case
  "b0clpm6gqd\n", // newline-ish
  "çğıöşü", // unicode
];

function classify(status) {
  // Beklenti: invalid inputlar 400/404 vs dönebilir; 500 olmamalı.
  if (status >= 500) return "FAIL_SERVER_ERROR";
  return "OK";
}

async function run() {
  const results = [];

  for (const asin of payloads) {
    const path = PRODUCT_PATH(STORE_ID, encodeURIComponent(String(asin)));
    const res = await getWithAuth(path);

    results.push({
      check: "inputValidation",
      asinSample: asin,
      status: res.status,
      classification: classify(res.status),
    });
  }

  return results;
}

module.exports = { run };
