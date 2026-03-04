const {
  createRunFolder,
  writeJson,
  writeMarkdown,
  writeCSV,
} = require("../report/reporter");

const { initAuth } = require("../auth");

async function runTool(selected, cli) {
  await initAuth();

  const result = await selected.run?.(cli);

  if (!result) return;

  const toolName = selected.name.toLowerCase().replace(/[^\w]+/g, "_");
  const dir = createRunFolder(toolName);

  writeJson(dir, "results.json", result);
  writeMarkdown(dir, "report.md", result, selected.name);

  if (
    selected.name.includes("Reconciliation") ||
    selected.name.includes("Buyable") ||
    selected.name.includes("Order Audit") ||
    selected.name.includes("Product Audit")
  ) {
    await writeCSV(dir, "report.csv", result);
  }

  console.log(`\n📁 Saved to: ${dir}`);
}

module.exports = { runTool };
