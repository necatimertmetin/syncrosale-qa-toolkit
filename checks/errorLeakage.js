const { PRODUCT_PATH, STORE_ID } = require("../config");
const { getWithAuth } = require("../api");

function looksLeaky(bodyText) {
  const s = (bodyText || "").toLowerCase();
  return (
    s.includes("stacktrace") ||
    s.includes("exception") ||
    s.includes("nullpointer") ||
    s.includes("org.springframework") ||
    s.includes("at com.") ||
    s.includes("traceback")
  );
}

async function run() {
  // Benign ama error üretme ihtimali yüksek edge input
  const path = PRODUCT_PATH(STORE_ID, encodeURIComponent("A".repeat(512)));
  const res = await getWithAuth(path);

  const body =
    typeof res.data === "string" ? res.data : JSON.stringify(res.data);

  return [
    {
      check: "errorLeakage",
      status: res.status,
      leaky: looksLeaky(body),
      classification:
        res.status >= 500
          ? "FAIL_SERVER_ERROR"
          : looksLeaky(body)
            ? "FAIL_INFO_LEAK"
            : "OK",
    },
  ];
}

module.exports = { run };
