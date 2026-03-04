const { getWithAuth } = require("../../../api");
const { calculateProfit } = require("./profitCalculation");

async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("🧾 Enter Order ID: ", async (orderId) => {
      if (!orderId) {
        console.log("❌ Order ID boş olamaz");
        return resolve([]);
      }

      const endpoint = `/store/1/order/${orderId}`;

      try {
        const res = await getWithAuth(endpoint);
        const data = res.data?.responseData;

        if (!data) {
          console.log("❌ No data");
          return resolve([]);
        }

        const overridden = data?.overriddenFinancialReport;
        const actual = data?.actualFinancialReport;

        const backendProfit =
          overridden?.profit ??
          actual?.profit ??
          data?.estimatedFinancialReport?.profit ??
          0;

        const { profit: expectedProfit, breakdown } = calculateProfit({
          overridden,
          actual,
        });

        const diff = Number((backendProfit - expectedProfit).toFixed(2));
        const isValid = Math.abs(diff) < 0.01;

        let issue = "NONE";

        if (!isValid) {
          issue = "MISMATCH";
        }

        const result = {
          endpoint,
          orderId,
          expectedProfit,
          backendProfit,
          diff,
          isValid,
          issue,
          ...breakdown,
        };

        console.log("\n📊 PROFIT VALIDATION RESULT");
        console.table([result]);

        const summary = {
          type: "SUMMARY",
          totalChecked: 1,
          passed: isValid ? 1 : 0,
          failed: isValid ? 0 : 1,
        };

        resolve([summary, result]);
      } catch (e) {
        console.log("❌ ERROR:", e.message);
        resolve([]);
      }
    });
  });
}

module.exports = { run };
