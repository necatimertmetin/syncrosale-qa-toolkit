const {
  PRODUCT_PATH,
  STORE_ID,
  OTHER_STORE_IDS_TO_TEST,
  KNOWN_GOOD_ASIN,
} = require("../config");
const { getWithAuth } = require("../api");

function classify(expected, actual) {
  return expected.includes(actual) ? "OK" : "FAIL_UNEXPECTED_STATUS";
}

async function run() {
  const results = [];

  // Control: kendi store’unda 200 beklenir (ürün varsa)
  const controlRes = await getWithAuth(PRODUCT_PATH(STORE_ID, KNOWN_GOOD_ASIN));

  results.push({
    scenario: "control_same_store",
    storeId: STORE_ID,
    status: controlRes.status,
    expected: "[200/404]",
    classification:
      controlRes.status === 200 || controlRes.status === 404
        ? "OK"
        : "FAIL_UNEXPECTED_STATUS",
  });

  // Diğer store’lara erişim: idealde 403 veya 404
  for (const otherStoreId of OTHER_STORE_IDS_TO_TEST) {
    const res = await getWithAuth(PRODUCT_PATH(otherStoreId, KNOWN_GOOD_ASIN));

    results.push({
      scenario: "cross_store_access",
      storeId: otherStoreId,
      status: res.status,
      expected: "[403/404]",
      classification: classify([403, 404], res.status),
    });
  }

  return results;
}

module.exports = { run };
