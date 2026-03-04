const { getWithAuth } = require("../../../api");
const { audit } = require("./orderAudit");

async function run() {
  try {
    console.log("📥 Fetching orders from Syncro API...\n");

    const res = await getWithAuth(
      "/store/1/order/export?sort=created&order=desc&extended=true",
    );

    if (res.status !== 200) {
      console.log("❌ Failed to fetch CSV:", res.status);
      return [];
    }

    const csv =
      typeof res.data === "string" ? res.data : JSON.stringify(res.data);

    const result = audit(csv);

    console.log("\n📊 ORDER AUDIT DONE");

    return result;
  } catch (e) {
    console.log("❌ ERROR:", e.message);
    return [];
  }
}

module.exports = { run };
