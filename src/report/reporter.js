const fs = require("fs");
const path = require("path");
const { OUT_DIR } = require("../config");
const { getCurrentAccount } = require("../auth");
// ---------------- FORMAT HELPERS ----------------
function formatValue(val) {
  if (val === null || val === undefined) return "";

  if (typeof val === "number") {
    return Number.isInteger(val) ? val : val.toFixed(2);
  }

  if (typeof val === "object") {
    return ""; // object basma (renderer handle eder)
  }

  return String(val).replace(/\n/g, " ").slice(0, 80);
}

function formatPercent(count, total) {
  if (!total) return "0%";

  const raw = (count / total) * 100;

  if (raw > 0 && raw < 0.01) return "<0.01%";

  return `${raw.toFixed(2)}%`;
}

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");

  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `${date} ${time} (${tz})`;
}

function getTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// ---------------- FILE OPS ----------------
function deleteAllReports() {
  if (!fs.existsSync(OUT_DIR)) {
    console.log("📁 No reports folder found");
    return;
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  console.log("🗑️ All reports deleted");
}

function createRunFolder(toolName) {
  const timestamp = getTimestamp();

  const user = getCurrentAccount() || "unknown";

  const dir = path.join(OUT_DIR, user, `${timestamp}_${toolName}`);

  fs.mkdirSync(dir, { recursive: true });

  return dir;
}

function writeJson(dir, filename, data) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

// ---------------- INSIGHT ENGINE ----------------
function buildInsights(summary) {
  const insights = [];

  const m = summary.marginDistribution;

  if (m?.EXCELLENT?.rate > 90) {
    insights.push(
      "⚠️ Most products have extremely high margin → possible cost/price data issue",
    );
  }

  if (summary.gold?.rate > 30) {
    insights.push("🟢 High ratio of Gold Products → catalog quality is strong");
  }

  if (summary.stockHealth?.deadStock?.rate > 5) {
    insights.push(
      "📦 Dead stock ratio is high → potential overstock / low demand products",
    );
  }

  return insights;
}

// ---------------- MARKDOWN ----------------
function writeMarkdown(dir, filename, results, title = "QA Report") {
  const lines = [];
  const customRender = results.__renderer;

  lines.push(`# ${title}`);
  lines.push(`Generated: ${formatDate()}`);
  lines.push("");

  // Support legacy array-based results (tools that return an array of entries)
  // as well as the newer object-based results (e.g. productAuditAdvanced).
  let normalized = results;

  if (results && !Array.isArray(results) && typeof results === "object") {
    if (results.summary) {
      normalized = [results.summary];
    } else {
      normalized = [];
    }
  }

  if (!normalized?.length) {
    lines.push("_No results_");
    fs.writeFileSync(path.join(dir, filename), lines.join("\n"));
    return;
  }

  const summary = normalized.find((r) => r.type === "SUMMARY");

  // 🔥 INSIGHTS
  if (summary) {
    const insights = buildInsights(summary);

    if (insights?.length) {
      lines.push("## 🧠 Insights");
      lines.push("");

      insights.forEach((i) => lines.push(`- ${i}`));

      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  // 🔥 SUMMARY RENDERING
  if (summary) {
    const pretty = summary.prettyReport || summary._prettyReport;

    // 1️⃣ Pretty markdown report
    if (pretty) {
      lines.push(pretty);
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    // 2️⃣ Custom renderer
    else if (customRender) {
      customRender(summary, lines, results);
    }

    // 3️⃣ Default summary table
    else {
      lines.push("## 📊 Summary");
      lines.push("");
      lines.push("| Metric | Value |");
      lines.push("|--------|-------|");

      Object.entries(summary)
        .filter(
          ([k]) =>
            ![
              "_priceSeverity",
              "_stockSeverity",
              "_prettyReport",
              "prettyReport",
              "type",
            ].includes(k),
        )
        .forEach(([k, v]) => {
          lines.push(`| ${k} | ${formatValue(v)} |`);
        });

      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  // 🔥 SAMPLE DATA
  const data = normalized.filter((r) => r.type !== "SUMMARY");

  const MAX_ROWS = 50;
  const sample = data.slice(0, MAX_ROWS);

  lines.push(`## 🔍 Sample Results (First ${MAX_ROWS})`);
  lines.push("");

  if (!sample.length) {
    lines.push("_No data_");
  } else {
    const keys = new Set();
    sample.forEach((i) => Object.keys(i).forEach((k) => keys.add(k)));

    const columns = Array.from(keys).filter((c) => c !== "type");

    lines.push(`| ${columns.join(" | ")} |`);
    lines.push(`|${columns.map(() => "---").join("|")}|`);

    for (const item of sample) {
      const row = columns.map((col) => formatValue(item[col]));
      lines.push(`| ${row.join(" | ")} |`);
    }
  }

  lines.push("");
  lines.push("## 📁 Full Data");
  lines.push("See results.json for complete dataset.");

  fs.writeFileSync(path.join(dir, filename), lines.join("\n"));
}
// ---------------- CSV ----------------
function writeCSV(dir, filename, results) {
  return new Promise((resolve, reject) => {
    if (!results?.length) return resolve();

    const data = results.filter((r) => r.type !== "SUMMARY");
    if (!data.length) return resolve();

    const filePath = path.join(dir, filename);

    console.log(`📝 Writing CSV (${data.length} rows)...`);

    const stream = fs.createWriteStream(filePath, { encoding: "utf-8" });

    const keys = new Set();
    data.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    const columns = Array.from(keys);

    stream.write(columns.join(",") + "\n");

    for (const row of data) {
      const values = columns.map((col) => {
        let val = row[col];

        if (val === null || val === undefined) return "";
        if (typeof val === "object") return "";

        return `"${String(val).replace(/"/g, '""')}"`;
      });

      stream.write(values.join(",") + "\n");
    }

    stream.end();
    stream.on("finish", () => {
      console.log("✅ CSV write completed");
      resolve();
    });

    stream.on("error", (err) => reject(err));
  });
}

module.exports = {
  createRunFolder,
  writeJson,
  writeMarkdown,
  writeCSV,
  deleteAllReports,
};
