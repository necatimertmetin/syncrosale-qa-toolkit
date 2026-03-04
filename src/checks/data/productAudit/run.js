const { getWithAuth } = require("../../../api");
const { audit } = require("./productAudit");
const { render } = require("./renderer");

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

    const result = audit(csv);

    console.log("\n📊 PRODUCT AUDIT DONE");

    result.__renderer = render;

    return result;
  } catch (e) {
    console.log("❌ ERROR:", e.message);
    return [];
  }
}

module.exports = { run };
