const fs = require("fs");
const path = require("path");
const { OUT_DIR } = require("../config");

function formatValue(val) {
  if (val === null || val === undefined) return "";

  if (typeof val === "number") {
    return Number.isInteger(val) ? val : val.toFixed(2);
  }

  if (typeof val === "object") {
    return ""; // object basma
  }

  return String(val).replace(/\n/g, " ").slice(0, 50);
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
function deleteAllReports() {
  const fs = require("fs");

  if (!fs.existsSync(OUT_DIR)) {
    console.log("📁 No reports folder found");
    return;
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });

  console.log("🗑️ All reports deleted");
}

function createRunFolder(toolName) {
  const timestamp = getTimestamp();

  const dir = path.join(OUT_DIR, toolName, timestamp);

  fs.mkdirSync(dir, { recursive: true });

  return dir;
}

function writeJson(dir, filename, data) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

function writeMarkdown(dir, filename, results, title = "QA Report") {
  const lines = [];

  lines.push(`# ${title}`);
  lines.push(`Generated: ${formatDate()}`);
  lines.push("");

  if (!results?.length) {
    lines.push("_No results_");
    fs.writeFileSync(path.join(dir, filename), lines.join("\n"));
    return;
  }

  // 🔥 SUMMARY
  const summary = results.find((r) => r.type === "SUMMARY");

  if (summary) {
    lines.push("## 📊 Summary\n");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");

    Object.entries(summary).forEach(([k, v]) => {
      lines.push(`| ${k} | ${v} |`);
    });

    lines.push("\n---\n");
  }

  // 🔥 DATA
  const data = results.filter((r) => r.type !== "SUMMARY");

  const MAX_ROWS = 50;
  const sample = data.slice(0, MAX_ROWS);

  lines.push(`## 🔍 Sample Results (First ${MAX_ROWS})\n`);

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

  lines.push("\n");
  lines.push("## 📁 Full Data");
  lines.push("See results.json for complete dataset.");

  fs.writeFileSync(path.join(dir, filename), lines.join("\n"));
}
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

    // header
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

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = {
  createRunFolder,
  writeJson,
  writeMarkdown,
  writeCSV,
  deleteAllReports,
};
