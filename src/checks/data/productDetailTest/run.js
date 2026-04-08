const _chalk = require("chalk");
const chalk = _chalk.default || _chalk;
const { parse } = require("csv-parse/sync");

const { getWithAuth } = require("../../../api");
const { getStoreId } = require("../../../auth");
const { CONCURRENCY } = require("../../../config");
const { mapConcurrent } = require("../../../utils/concurrency");
const { audit } = require("./productDetailTest");

async function fetchProductDetail(storeId, asin) {
  try {
    const res = await getWithAuth(`/store/${storeId}/product/${asin}`, 2, { silent: true });
    if (res.status !== 200) return null;
    return res.data?.responseData ?? res.data;
  } catch {
    return null;
  }
}

async function run() {
  try {
    const storeId = getStoreId();

    // 1. Fetch product list (CSV export) to get ASIN list
    console.log("📥 Fetching product list...\n");
    const csvRes = await getWithAuth(`/store/${storeId}/product/export`, 2, {
      headers: { Accept: "text/csv" },
    });

    if (csvRes.status !== 200) {
      console.log("❌ Failed to fetch product CSV:", csvRes.status);
      return [];
    }

    const csvText = typeof csvRes.data === "string" ? csvRes.data : csvRes.data.toString("utf8");
    const rows = parse(csvText.replace(/^\uFEFF/, ""), {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    });

    const asins = [...new Set(rows.map((r) => r["Asin"]).filter(Boolean))];
    console.log(`📦 Found ${asins.length} unique ASINs\n`);

    if (asins.length === 0) {
      console.log("No products to check.");
      return [];
    }

    // 2. Fetch product details concurrently
    console.log(`🌐 Fetching product details (concurrency=${CONCURRENCY})...\n`);

    let done = 0;
    const total = asins.length;

    const details = await mapConcurrent(
      asins,
      async (asin) => {
        const detail = await fetchProductDetail(storeId, asin);
        done++;
        if (done % 25 === 0 || done === total) {
          console.log(chalk.gray(`   Progress: ${done}/${total}`));
        }
        return detail;
      },
      CONCURRENCY,
    );

    const validDetails = details.filter(Boolean);
    console.log(`\n✅ Fetched ${validDetails.length}/${total} product details\n`);

    if (validDetails.length === 0) {
      console.log("No valid product details returned.");
      return [];
    }

    // 3. Run audit
    const results = audit(validDetails);

    const summary = results.find((r) => r.type === "SUMMARY");

    if (summary?.prettyReport) {
      console.log("\n");
      console.log(summary.prettyReport);
      console.log("\n");
    }

    return [summary, ...results.filter((r) => r.type !== "SUMMARY")];
  } catch (e) {
    console.log("❌ ERROR:", e.message);
    return [];
  }
}

module.exports = { run };
