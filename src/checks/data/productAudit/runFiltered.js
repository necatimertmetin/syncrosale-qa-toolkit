const readline = require("readline");
const { getWithAuth } = require("../../../api");
const { PRESETS } = require("./presets");
const { runAudits } = require("./audits");

/* =========================================================
   READLINE
   ========================================================= */

function createAsk(cli) {
  if (cli?.ask) {
    return {
      ask: (q) => new Promise((res) => cli.ask(q, res)),
      close: () => {},
    };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask: (q) => new Promise((res) => rl.question(q, (a) => res(a.trim()))),
    close: () => rl.close(),
  };
}

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

function selectFromOptions(prompt, options) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // fallback to basic prompt
      console.log(prompt);
      return resolve(options[0]);
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    let selectedIndex = 0;

    function render() {
      clearScreen();
      console.log("\n" + prompt + "\n");
      options.forEach((opt, i) => {
        const prefix = i === selectedIndex ? "›" : " ";
        const line = `${prefix} ${opt}`;
        console.log(i === selectedIndex ? `\x1b[36m${line}\x1b[0m` : line);
      });
      console.log("\nUse ↑/↓ to navigate, ENTER to select");
    }

    function onKey(_, key) {
      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
      }

      if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
      }

      if (key.name === "return") {
        cleanup();
        resolve(options[selectedIndex]);
      }

      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeListener("keypress", onKey);
      clearScreen();
    }

    process.stdin.on("keypress", onKey);

    render();
  });
}

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

async function run(cli) {
  const { ask, close } = createAsk(cli);

  try {
    console.log("\n📊 CSV Dataset Inspector\n");

    const mode = (
      await selectFromOptions("Select mode:", [
        "1) Single preset",
        "2) Multiple presets",
        "3) Run ALL presets",
      ])
    )[0];

    let selectedKeys = [];

    /* ---------- SINGLE ---------- */
    if (mode === "1") {
      printPresetList();

      const key = await ask("Preset key: ");

      if (!PRESETS[key]) {
        console.log("❌ Invalid preset key");
        close();
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
        close();
        return [];
      }
    } else if (mode === "3") {
      /* ---------- ALL ---------- */
      selectedKeys = Object.keys(PRESETS);
    } else {
      console.log("❌ Invalid selection");
      close();
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
        csv,
      };
    }

    console.log("✅ Inspection completed.\n");

    const audits = runAudits(datasets);
    const prettyReport = require("./audits").buildPrettyReport(audits);

    close();

    return {
      datasets,
      audits,
      summary: {
        type: "SUMMARY",
        prettyReport,
      },
    };
  } catch (e) {
    console.log("❌ ERROR:", e.message);
    close();
    return [];
  }
}

module.exports = { run, PRESETS };
