const pLimit = require("p-limit");
const { PRODUCT_PATH, STORE_ID, KNOWN_GOOD_ASIN } = require("../../config");
const { getWithAuth } = require("../../api");

async function run() {
  const limit = pLimit(50); // küçük burst
  const path = PRODUCT_PATH(STORE_ID, KNOWN_GOOD_ASIN);

  const reqs = Array.from({ length: 200 }).map(() =>
    limit(() => getWithAuth(path, 0, { silent: true })),
  );

  const resList = await Promise.all(reqs);

  const statuses = resList.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const has429 = Boolean(statuses[429]);

  return [
    {
      sampleRequests: 30,
      statuses,
      classification: has429 ? "OK_RATE_LIMIT_PRESENT" : "WARN_NO_429_SEEN",
    },
  ];
}

module.exports = { run };
