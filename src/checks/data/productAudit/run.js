const { getWithAuth } = require("../../../api");

const { audit } = require("./productAudit");

async function run() {
  try {
    console.log("📥 Fetching products from Syncro API...\n");

    const res = await getWithAuth("/store/1/product/export");

    if (res.status !== 200) {
      console.log("❌ Failed to fetch CSV:", res.status);
      return [];
    }

    const csv =
      typeof res.data === "string" ? res.data : JSON.stringify(res.data);

    const results = audit(csv);

    const summary = results.find((r) => r.type === "SUMMARY");

    if (summary?.prettyReport) {
      console.log("\n");
      console.log(summary.prettyReport);
      console.log("\n");
    }

    // CLI standard output
    return [summary, ...results.filter((r) => r.type !== "SUMMARY")];
  } catch (e) {
    console.log("❌ ERROR:", e.message);

    return [];
  }
}

module.exports = { run };
