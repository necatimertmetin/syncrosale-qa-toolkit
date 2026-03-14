const readline = require("readline");
const { getWithAuth } = require("../../../api");
const { PRESETS } = require("./presets");

/* =========================================================
   PRESETS
   ========================================================= */

/* =========================================================
   READLINE
   ========================================================= */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

const closeCli = () => rl.close();

/* =========================================================
   HELPERS
   ========================================================= */

function countCsvRows(csvText) {
  const cleaned = csvText.replace(/^\uFEFF/, "");

  const lines = cleaned.split("\n").filter((l) => l.trim() !== "");

  if (lines.length === 0) return 0;

  // first line = header
  return lines.length - 1;
}

function printPresetList() {
  console.log("\nAvailable presets:\n");
  Object.entries(PRESETS).forEach(([key, p]) => {
    console.log(`  ${key.padEnd(18)} → ${p.label}`);
  });
  console.log("");
}

/* =========================================================
   FETCH CSV
   ========================================================= */

async function fetchCsv(predicate) {
  const res = await getWithAuth(
    "/store/1/product/export",
    2, // retries
    {
      params: {
        predicate: JSON.stringify(predicate),
        extended: true,
      },
      headers: {
        Accept: "text/csv",
      },
    },
  );

  if (res.status !== 200) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  return typeof res.data === "string" ? res.data : res.data.toString("utf8");
}

/* =========================================================
   MAIN RUNNER
   ========================================================= */

async function run() {
  try {
    console.log("\n📊 CSV Dataset Inspector\n");

    console.log("1) Single preset");
    console.log("2) Multiple presets");
    console.log("3) Run ALL presets\n");

    const mode = await ask("Select mode (1/2/3): ");

    let selectedKeys = [];

    /* ---------- SINGLE ---------- */
    if (mode === "1") {
      printPresetList();

      const key = await ask("Preset key: ");

      if (!PRESETS[key]) {
        console.log("❌ Invalid preset key");
        closeCli();
        return [];
      }

      selectedKeys = [key];
    } else if (mode === "2") {
      /* ---------- MULTIPLE ---------- */
      printPresetList();

      const input = await ask("Enter preset keys (comma separated): ");

      selectedKeys = input
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      if (selectedKeys.length === 0) {
        console.log("❌ No presets selected");
        closeCli();
        return [];
      }
    } else if (mode === "3") {
      /* ---------- ALL ---------- */
      selectedKeys = Object.keys(PRESETS);
    } else {
      console.log("❌ Invalid selection");
      closeCli();
      return [];
    }

    console.log("\n📥 Fetching CSV datasets...\n");

    const datasets = {};

    for (const key of selectedKeys) {
      const preset = PRESETS[key];

      console.log(`➡ ${preset.label}`);

      const csv = await fetchCsv(preset.predicate);

      const rowCount = countCsvRows(csv);

      console.log(`Rows: ${rowCount}\n`);

      datasets[key] = {
        label: preset.label,
        rows: rowCount,
      };
    }

    console.log("✅ Inspection completed.\n");

    closeCli();

    return datasets;
  } catch (e) {
    console.log("❌ ERROR:", e.message);
    closeCli();
    return [];
  }
}

module.exports = { run, PRESETS };
