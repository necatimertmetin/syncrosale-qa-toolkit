/*
  Audit utilities for product audit CSV datasets.

  The audit runs a set of checks on each dataset and across datasets,
  producing a structured report that highlights structural issues,
  duplicates, pricing anomalies, and cross-dataset inconsistencies.
*/

function parseCsv(csvText) {
  if (!csvText) return { headers: [], rows: [], errors: [] };

  const lines = csvText
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (!lines.length) return { headers: [], rows: [], errors: [] };

  const errors = [];

  function splitLine(line) {
    const fields = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // escaped quote
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }

        continue;
      }

      if (ch === "," && !inQuotes) {
        fields.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }

    fields.push(cur);
    return fields;
  }

  const headers = splitLine(lines[0]).map((h) => h.trim());

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    try {
      const values = splitLine(line);
      if (values.length !== headers.length) {
        errors.push({
          line: i + 1,
          message: `Column count mismatch (expected ${headers.length}, got ${values.length})`,
          raw: line,
        });
      }

      const row = {};
      for (let j = 0; j < headers.length; j += 1) {
        row[headers[j]] = values[j] ?? "";
      }

      rows.push(row);
    } catch (err) {
      errors.push({ line: i + 1, message: err.message, raw: line });
    }
  }

  return { headers, rows, errors };
}

function normalizeKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHeader(headers, candidates) {
  const norm = headers.reduce((acc, h) => {
    acc[normalizeKey(h)] = h;
    return acc;
  }, {});

  for (const candidate of candidates) {
    const found = norm[normalizeKey(candidate)];
    if (found) return found;
  }

  return undefined;
}

function countNulls(rows, headers) {
  const counts = {};

  for (const header of headers) {
    counts[header] = 0;
  }

  for (const row of rows) {
    for (const header of headers) {
      const raw = row[header];
      if (raw === null || raw === undefined || String(raw).trim() === "") {
        counts[header] += 1;
      }
    }
  }

  return counts;
}

function uniqueCounts(rows, key) {
  const map = new Map();

  for (const row of rows) {
    const val = (row[key] ?? "").trim();
    const bucket = map.get(val) || [];
    bucket.push(row);
    map.set(val, bucket);
  }

  return map;
}

function numeric(value) {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}

function runDatasetChecks(name, csvText) {
  const { headers, rows, errors } = parseCsv(csvText);

  const requiredFields = ["id", "sku", "asin", "price", "cost", "stock"];

  const missingHeaders = requiredFields
    .map((f) => ({ field: f, found: findHeader(headers, [f]) }))
    .filter((r) => !r.found)
    .map((r) => r.field);

  const nullCounts = countNulls(rows, headers);

  const missingRequiredFieldCounts = [];
  for (const req of requiredFields) {
    const header = findHeader(headers, [req]);
    if (!header) continue;
    const count = nullCounts[header] || 0;
    if (count > 0) {
      missingRequiredFieldCounts.push({ field: header, missing: count });
    }
  }

  const duplicates = {};
  const dupeKeys = [
    "sku",
    "asin",
    "barcode",
    "externalid",
    "marketplaceproductid",
    "storeproductid",
  ];
  for (const key of dupeKeys) {
    const header = findHeader(headers, [key]);
    if (!header) continue;

    const map = uniqueCounts(rows, header);
    const dupes = [];
    for (const [value, bucket] of map.entries()) {
      if (!value) continue;
      if (bucket.length > 1) {
        dupes.push({ value, count: bucket.length });
      }
    }

    if (dupes.length) {
      duplicates[header] = dupes;
    }
  }

  const pricingIssues = [];
  const priceHeader = findHeader(headers, ["price", "listprice", "unitprice"]);
  const costHeader = findHeader(headers, ["cost", "costprice"]);
  const commissionHeader = findHeader(headers, [
    "commission",
    "amazoncommission",
  ]);
  const shippingHeader = findHeader(headers, ["shippingcost", "shipping"]);

  if (priceHeader) {
    for (const row of rows) {
      const price = numeric(row[priceHeader]);
      const cost = costHeader ? numeric(row[costHeader]) : null;
      const commission = commissionHeader
        ? numeric(row[commissionHeader])
        : null;
      const shipping = shippingHeader ? numeric(row[shippingHeader]) : null;

      if (price !== null && cost !== null && price < cost) {
        pricingIssues.push({ type: "PRICE_LESS_THAN_COST", price, cost, row });
      }

      if (price !== null && price === 0) {
        pricingIssues.push({ type: "ZERO_PRICE", row });
      }

      if (commission !== null && price !== null && commission > price) {
        pricingIssues.push({
          type: "COMMISSION_GT_PRICE",
          price,
          commission,
          row,
        });
      }

      if (shipping !== null && price !== null && shipping > price) {
        pricingIssues.push({ type: "SHIPPING_GT_PRICE", price, shipping, row });
      }
    }
  }

  const stockIssues = [];
  const stockHeader = findHeader(headers, ["stock", "qty", "quantity"]);
  if (stockHeader) {
    for (const row of rows) {
      const stock = numeric(row[stockHeader]);
      if (stock !== null && stock < 0) {
        stockIssues.push({ type: "NEGATIVE_STOCK", stock, row });
      }
      if (stock !== null && stock > 1000000) {
        stockIssues.push({ type: "UNREALISTIC_STOCK", stock, row });
      }
    }
  }

  return {
    name,
    rowCount: rows.length,
    headers,
    errors,
    missingHeaders,
    missingRequiredFieldCounts,
    nullCounts,
    duplicates,
    pricingIssues,
    stockIssues,
  };
}

function runCrossDatasetChecks(datasets) {
  const keyFields = [
    "sku",
    "asin",
    "barcode",
    "externalid",
    "marketplaceproductid",
    "storeproductid",
  ];
  const index = {};

  const skuSets = {};

  for (const [datasetName, dataset] of Object.entries(datasets)) {
    if (!dataset.csv) continue;

    const { headers, rows } = parseCsv(dataset.csv);

    // Track SKU sets for active/buyable checks
    const skuHeader = findHeader(headers, ["sku"]);
    if (skuHeader) {
      skuSets[datasetName] = new Set(
        rows.map((r) => String(r[skuHeader] ?? "").trim()).filter(Boolean),
      );
    }

    for (const field of keyFields) {
      const header = findHeader(headers, [field]);
      if (!header) continue;

      for (const row of rows) {
        const value = (row[header] ?? "").trim();
        if (!value) continue;

        const key = `${field}:${value}`;
        if (!index[key]) index[key] = new Set();
        index[key].add(datasetName);
      }
    }
  }

  const duplicatesAcross = [];
  for (const [key, set] of Object.entries(index)) {
    if (set.size > 1) {
      const [field, value] = key.split(":");
      const datasetList = Array.from(set);

      // Skip if this is ONLY a valid combination that shouldn't be considered duplicate
      const hasDiscoverable = datasetList.includes("discoverable");
      const hasInactive = datasetList.includes("inactive");
      const hasActive = datasetList.includes("active");
      const hasBuyable = datasetList.includes("buyable");

      // Skip if datasets are ONLY discoverable and inactive
      if (
        hasDiscoverable &&
        hasInactive &&
        datasetList.length === 2 &&
        datasetList.every((d) => d === "discoverable" || d === "inactive")
      )
        continue;

      // Skip if datasets are ONLY active and buyable
      if (
        hasActive &&
        hasBuyable &&
        datasetList.length === 2 &&
        datasetList.every((d) => d === "active" || d === "buyable")
      )
        continue;

      duplicatesAcross.push({ field, value, datasets: datasetList });
    }
  }

  const activeSet = skuSets["active"] || new Set();
  const buyableSet = skuSets["buyable"] || new Set();

  const activeButNotBuyable = [];
  const buyableButNotActive = [];

  for (const sku of activeSet) {
    if (!buyableSet.has(sku)) activeButNotBuyable.push(sku);
  }
  for (const sku of buyableSet) {
    if (!activeSet.has(sku)) buyableButNotActive.push(sku);
  }

  return {
    duplicatesAcross,
    activeButNotBuyable,
    buyableButNotActive,
  };
}

const fs = require("fs");

function summarizeDatasetReport(report) {
  const summary = {
    name: report.name,
    rows: report.rowCount,
    errors: report.errors?.length ?? 0,
    missingHeaders: report.missingHeaders || [],
    missingRequiredFieldCounts: report.missingRequiredFieldCounts || [],
    duplicates: report.duplicates || {},
    pricingIssues: (report.pricingIssues || []).length,
    stockIssues: (report.stockIssues || []).length,
  };
  return summary;
}

function buildPrettyReport(auditReport) {
  const lines = [];

  lines.push(`# 📊 Product Audit Report`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  const datasets = Object.keys(auditReport.perDataset || {});
  lines.push(`## Datasets analyzed (${datasets.length})`);
  lines.push("");

  const totalRows = datasets.reduce(
    (sum, ds) => sum + (auditReport.perDataset[ds].rowCount || 0),
    0,
  );
  lines.push(`- Total rows inspected: **${totalRows}**`);
  lines.push(`- Datasets: ${datasets.join(", ")}`);
  lines.push("");

  // Quick overall counts
  const totalErrors = datasets.reduce(
    (sum, ds) => sum + (auditReport.perDataset[ds].errors?.length || 0),
    0,
  );

  const totalPricingIssues = datasets.reduce(
    (sum, ds) => sum + (auditReport.perDataset[ds].pricingIssues?.length || 0),
    0,
  );

  const totalStockIssues = datasets.reduce(
    (sum, ds) => sum + (auditReport.perDataset[ds].stockIssues?.length || 0),
    0,
  );

  lines.push(`- Total parse errors: **${totalErrors}**`);
  lines.push(`- Total pricing issues: **${totalPricingIssues}**`);
  lines.push(`- Total stock issues: **${totalStockIssues}**`);
  lines.push("");

  // Per dataset details
  lines.push(`## Dataset summaries`);
  lines.push("");

  // Build a summary table
  const tableHeaders = [
    "Dataset",
    "Rows",
    "Errors",
    "Pricing Issues",
    "Stock Issues",
    "Missing Fields",
  ];
  lines.push(`| ${tableHeaders.join(" | ")} |`);
  lines.push(`|${tableHeaders.map(() => "---").join("|")}|`);

  for (const ds of datasets) {
    const report = auditReport.perDataset[ds];
    const summary = summarizeDatasetReport(report);

    const rowData = [
      `**${ds}**`,
      summary.rows.toLocaleString(),
      summary.errors > 0 ? `⚠️ ${summary.errors}` : "✅ 0",
      summary.pricingIssues > 0 ? `💰 ${summary.pricingIssues}` : "✅ 0",
      summary.stockIssues > 0 ? `📦 ${summary.stockIssues}` : "✅ 0",
      summary.missingRequiredFieldCounts.length > 0
        ? `❌ ${summary.missingRequiredFieldCounts.length} fields`
        : "✅ All present",
    ];

    lines.push(`| ${rowData.join(" | ")} |`);
  }

  lines.push("");

  // Detailed issues section
  const datasetsWithIssues = datasets.filter((ds) => {
    const report = auditReport.perDataset[ds];
    const summary = summarizeDatasetReport(report);
    return (
      summary.errors > 0 ||
      summary.pricingIssues > 0 ||
      summary.stockIssues > 0 ||
      summary.missingRequiredFieldCounts.length > 0 ||
      Object.keys(summary.duplicates).length > 0
    );
  });

  if (datasetsWithIssues.length > 0) {
    lines.push(`### 🔍 Detailed Issues`);
    lines.push("");

    for (const ds of datasetsWithIssues) {
      const report = auditReport.perDataset[ds];
      const summary = summarizeDatasetReport(report);

      lines.push(`#### ${ds}`);
      lines.push("");

      if (summary.missingHeaders.length) {
        lines.push(
          `- **Missing columns:** ${summary.missingHeaders.join(", ")}`,
        );
      }

      if (summary.missingRequiredFieldCounts.length) {
        const list = summary.missingRequiredFieldCounts
          .map((m) => `${m.field} (${m.missing} missing)`)
          .join(", ");
        lines.push(`- **Required field gaps:** ${list}`);
      }

      const duplicateKeys = Object.keys(summary.duplicates);
      if (duplicateKeys.length) {
        lines.push(`- **Duplicates found:**`);
        duplicateKeys.forEach((key) => {
          const dupes = summary.duplicates[key];
          const sample = dupes
            .slice(0, 3)
            .map((d) => `${d.value} (${d.count})`)
            .join(", ");
          lines.push(
            `  - ${key}: ${dupes.length} unique values (sample: ${sample})`,
          );
        });
      }

      lines.push("");
    }
  }

  // Cross dataset
  lines.push(`## Cross-dataset issues`);
  lines.push("");

  const cross = auditReport.crossDataset || {};
  const dupesAcross = cross.duplicatesAcross || [];
  const activeButNotBuyable = cross.activeButNotBuyable || [];
  const buyableButNotActive = cross.buyableButNotActive || [];

  // Summary table for cross-dataset issues
  const crossTableHeaders = ["Issue Type", "Count", "Status"];
  lines.push(`| ${crossTableHeaders.join(" | ")} |`);
  lines.push(`|${crossTableHeaders.map(() => "---").join("|")}|`);

  const crossIssues = [
    {
      type: "Duplicate keys across datasets",
      count: dupesAcross.length,
      icon: dupesAcross.length > 0 ? "⚠️" : "✅",
    },
    {
      type: "ACTIVE but not BUYABLE",
      count: activeButNotBuyable.length,
      icon: activeButNotBuyable.length > 0 ? "🚨" : "✅",
    },
    {
      type: "BUYABLE but not ACTIVE",
      count: buyableButNotActive.length,
      icon: buyableButNotActive.length > 0 ? "🚨" : "✅",
    },
  ];

  crossIssues.forEach((issue) => {
    lines.push(
      `| ${issue.type} | **${issue.count}** | ${issue.icon} ${issue.count > 0 ? "Issues found" : "All good"} |`,
    );
  });

  lines.push("");

  // Detailed sections for issues
  if (dupesAcross.length > 0) {
    lines.push(`### 🔄 Duplicate Keys Across Datasets`);
    lines.push("");
    lines.push(
      `Found **${dupesAcross.length}** keys appearing in multiple datasets:`,
    );
    lines.push("");

    const sample = dupesAcross.slice(0, 10);
    sample.forEach((d) => {
      lines.push(
        `- **${d.field}** = \`${d.value}\` → present in: ${d.datasets.join(", ")}`,
      );
    });
    if (dupesAcross.length > sample.length) {
      lines.push("");
      lines.push(
        `_...and ${dupesAcross.length - sample.length} more duplicates_`,
      );
    }
    lines.push("");
  }

  if (activeButNotBuyable.length > 0) {
    lines.push(`### 🚨 ACTIVE but not BUYABLE`);
    lines.push("");
    lines.push(
      `Found **${activeButNotBuyable.length}** products that are ACTIVE in store but not BUYABLE on Amazon:`,
    );
    lines.push("");

    const sample = activeButNotBuyable.slice(0, 15);
    sample.forEach((sku) => lines.push(`- \`${sku}\``));
    if (activeButNotBuyable.length > sample.length) {
      lines.push("");
      lines.push(`_...and ${activeButNotBuyable.length - sample.length} more_`);
    }
    lines.push("");
  }

  if (buyableButNotActive.length > 0) {
    lines.push(`### 🚨 BUYABLE but not ACTIVE`);
    lines.push("");
    lines.push(
      `Found **${buyableButNotActive.length}** products that are BUYABLE on Amazon but not ACTIVE in store:`,
    );
    lines.push("");

    const sample = buyableButNotActive.slice(0, 15);
    sample.forEach((sku) => lines.push(`- \`${sku}\``));
    if (buyableButNotActive.length > sample.length) {
      lines.push("");
      lines.push(`_...and ${buyableButNotActive.length - sample.length} more_`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(
    "> Tip: For full raw data, inspect `results.json` (contains raw CSVs per dataset).",
  );

  // ============================================================================
  // ADVANCED ANALYTICS SECTIONS
  // ============================================================================

  // Extract datasets for analysis
  const datasetData = {};
  for (const [key, dataset] of Object.entries(auditReport.perDataset || {})) {
    if (auditReport.rawDatasets && auditReport.rawDatasets[key]) {
      datasetData[key] = auditReport.rawDatasets[key];
    }
  }

  // Product Flow Analysis
  if (Object.keys(datasetData).length > 0) {
    lines.push("");
    lines.push(`## 📈 Product Flow & Pipeline Analysis`);
    lines.push("");

    const flow = analyzeProductFlow(datasetData);

    lines.push(`### Pipeline Overview`);
    lines.push(`- **Total Products**: ${flow.totalProducts.toLocaleString()}`);
    lines.push(`- **Active Products**: ${flow.byStage.active || 0}`);
    lines.push(`- **Buyable Products**: ${flow.byStage.buyable || 0}`);
    lines.push(
      `- **Discoverable Products**: ${flow.byStage.discoverable || 0}`,
    );
    lines.push("");

    if (Object.keys(flow.conversionRates).length > 0) {
      lines.push(`### Conversion Rates`);
      if (flow.conversionRates.discoveryToActive) {
        lines.push(
          `- Discovery → Active: **${flow.conversionRates.discoveryToActive}%**`,
        );
      }
      if (flow.conversionRates.discoveryToBuyable) {
        lines.push(
          `- Discovery → Buyable: **${flow.conversionRates.discoveryToBuyable}%**`,
        );
      }
      if (flow.conversionRates.activeToBuyable) {
        lines.push(
          `- Active → Buyable: **${flow.conversionRates.activeToBuyable}%**`,
        );
      }
      lines.push("");
    }

    if (flow.bottlenecks.length > 0) {
      lines.push(`### 🚨 Potential Bottlenecks`);
      flow.bottlenecks.forEach((bottleneck) => {
        lines.push(`- ${bottleneck}`);
      });
      lines.push("");
    }
  }

  // Financial Analysis
  if (datasetData.active) {
    lines.push(`## 💰 Financial Analysis`);
    lines.push("");

    const financials = analyzeFinancials(datasetData);

    lines.push(`### Key Financial Metrics`);
    lines.push(
      `- **Total Portfolio Value**: $${financials.totalValue.toLocaleString()}`,
    );
    lines.push(`- **Total Costs**: $${financials.totalCost.toLocaleString()}`);
    lines.push(
      `- **Estimated Revenue**: $${financials.totalRevenue.toLocaleString()}`,
    );
    lines.push(
      `- **Average Profit Margin**: ${financials.avgProfitMargin.toFixed(1)}%`,
    );
    lines.push(
      `- **Cost Data Coverage**: ${financials.costCoverage.toFixed(1)}%`,
    );
    lines.push("");

    if (financials.topProfitableCategories.length > 0) {
      lines.push(`### Top Profitable Categories`);
      lines.push(`| Category | Products | Avg Profit | Total Revenue |`);
      lines.push(`|----------|----------|------------|---------------|`);
      financials.topProfitableCategories.slice(0, 5).forEach((cat) => {
        lines.push(
          `| ${cat.category} | ${cat.count} | $${cat.avgProfit.toFixed(2)} | $${cat.totalRevenue.toFixed(2)} |`,
        );
      });
      lines.push("");
    }

    if (financials.pricingIssues.length > 0) {
      lines.push(
        `### ⚠️ Products with Negative Margins (${financials.pricingIssues.length})`,
      );
      financials.pricingIssues.slice(0, 10).forEach((issue) => {
        lines.push(`- **${issue.sku}**: ${issue.margin}% margin`);
      });
      if (financials.pricingIssues.length > 10) {
        lines.push(`_...and ${financials.pricingIssues.length - 10} more_`);
      }
      lines.push("");
    }
  }

  // Stock Analysis
  if (datasetData.active) {
    lines.push(`## 📦 Stock Analysis`);
    lines.push("");

    const stock = analyzeStock(datasetData);

    lines.push(`### Stock Overview`);
    lines.push(`- **Total Products**: ${stock.totalProducts}`);
    lines.push(
      `- **In Stock**: ${stock.inStock} (${stock.avgStockLevel}% of total)`,
    );
    lines.push(`- **Out of Stock**: ${stock.outOfStock}`);
    lines.push("");

    if (Object.keys(stock.stockDistribution).length > 0) {
      lines.push(`### Stock Level Distribution`);
      Object.entries(stock.stockDistribution).forEach(([range, count]) => {
        lines.push(`- ${range} units: ${count} products`);
      });
      lines.push("");
    }

    if (stock.lowStock.length > 0) {
      lines.push(`### ⚠️ Low Stock Alerts (${stock.lowStock.length})`);
      stock.lowStock.slice(0, 10).forEach((item) => {
        lines.push(`- **${item.sku}**: ${item.stock} units remaining`);
      });
      if (stock.lowStock.length > 10) {
        lines.push(`_...and ${stock.lowStock.length - 10} more_`);
      }
      lines.push("");
    }
  }

  // Category Analysis
  if (datasetData.active) {
    lines.push(`## 📂 Category Analysis`);
    lines.push("");

    const categories = analyzeCategories(datasetData);

    if (categories.topCategories.length > 0) {
      lines.push(`### Top Categories by Product Count`);
      lines.push(`| Category | Products | Avg Value | Avg Rating |`);
      lines.push(`|----------|----------|-----------|------------|`);
      categories.topCategories.slice(0, 10).forEach((cat) => {
        lines.push(
          `| ${cat.category} | ${cat.count} | $${cat.avgValue.toFixed(2)} | ${cat.avgRating.toFixed(1)} ⭐ |`,
        );
      });
      lines.push("");
    }
  }

  // Brand Analysis
  if (datasetData.active) {
    lines.push(`## 🏷️ Brand Analysis`);
    lines.push("");

    const brands = analyzeBrands(datasetData);

    if (brands.topBrands.length > 0) {
      lines.push(`### Top Brands by Product Count`);
      lines.push(`| Brand | Products | Avg Value | Avg Rating |`);
      lines.push(`|-------|----------|-----------|------------|`);
      brands.topBrands.slice(0, 10).forEach((brand) => {
        lines.push(
          `| ${brand.brand} | ${brand.count} | $${brand.avgValue.toFixed(2)} | ${brand.avgRating.toFixed(1)} ⭐ |`,
        );
      });
      lines.push("");
    }
  }

  // Quality Analysis
  if (datasetData.active) {
    lines.push(`## ⭐ Quality & Performance Analysis`);
    lines.push("");

    const quality = analyzeQuality(datasetData);

    lines.push(`### Rating Overview`);
    lines.push(`- **Average Rating**: ${quality.avgRating} ⭐`);
    lines.push(`- **Rating Coverage**: ${quality.ratingCoverage}% of products`);
    lines.push(
      `- **High-Rated Products (4.5+)**: ${quality.highRatedProducts.length}`,
    );
    lines.push(
      `- **Low-Rated Products (<3.0)**: ${quality.lowRatedProducts.length}`,
    );
    lines.push("");

    if (Object.keys(quality.ratingDistribution).length > 0) {
      lines.push(`### Rating Distribution`);
      Object.entries(quality.ratingDistribution).forEach(([range, count]) => {
        lines.push(`- ${range} stars: ${count} products`);
      });
      lines.push("");
    }

    if (quality.highRatedProducts.length > 0) {
      lines.push(`### 🏆 Top Rated Products`);
      quality.highRatedProducts.slice(0, 5).forEach((product) => {
        lines.push(`- **${product.sku}**: ${product.rating} ⭐`);
      });
      lines.push("");
    }

    if (quality.lowRatedProducts.length > 0) {
      lines.push(`### ⚠️ Products Needing Attention`);
      quality.lowRatedProducts.slice(0, 5).forEach((product) => {
        lines.push(`- **${product.sku}**: ${product.rating} ⭐`);
      });
      lines.push("");
    }
  }

  return lines.join("\n");
}

function runAudits(datasets) {
  const perDataset = {};

  for (const [key, dataset] of Object.entries(datasets)) {
    if (!dataset.csv) continue;
    perDataset[key] = runDatasetChecks(key, dataset.csv);
  }

  const cross = runCrossDatasetChecks(datasets);

  return {
    perDataset,
    crossDataset: cross,
    rawDatasets: datasets, // Include raw datasets for advanced analytics
    generatedAt: new Date().toISOString(),
  };
}

function auditFromResultsFile(filePath) {
  const json = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(json);

  // Extract datasets from results.json format
  const datasets = {};
  if (data.datasets) {
    for (const [key, dataset] of Object.entries(data.datasets)) {
      datasets[key] = {
        csv: dataset.csv,
        label: dataset.label,
        rows: dataset.rows,
      };
    }
  }

  return runAudits(datasets);
}

// ============================================================================
// ADVANCED ANALYTICS FUNCTIONS
// ============================================================================

function analyzeProductFlow(datasets) {
  const flow = {
    totalProducts: 0,
    byStage: {},
    conversionRates: {},
    bottlenecks: [],
  };

  // Count products by stage
  for (const [stage, data] of Object.entries(datasets)) {
    const count = data.rows || 0;
    flow.byStage[stage] = count;
    flow.totalProducts += count;
  }

  // Calculate conversion rates
  const active = flow.byStage.active || 0;
  const buyable = flow.byStage.buyable || 0;
  const discoverable = flow.byStage.discoverable || 0;

  if (discoverable > 0) {
    flow.conversionRates.discoveryToActive = (
      (active / discoverable) *
      100
    ).toFixed(1);
    flow.conversionRates.discoveryToBuyable = (
      (buyable / discoverable) *
      100
    ).toFixed(1);
  }

  if (active > 0) {
    flow.conversionRates.activeToBuyable = ((buyable / active) * 100).toFixed(
      1,
    );
  }

  // Identify bottlenecks
  if (flow.byStage.pendingApproval > 10) {
    flow.bottlenecks.push("High pending approval queue");
  }
  if (flow.byStage.outOfCriteria > 5) {
    flow.bottlenecks.push("Many products failing criteria");
  }
  if (flow.byStage.noData > 20) {
    flow.bottlenecks.push("Data collection issues");
  }

  return flow;
}

function analyzeFinancials(datasets) {
  const financials = {
    totalValue: 0,
    totalCost: 0,
    totalRevenue: 0,
    avgProfitMargin: 0,
    topProfitableCategories: [],
    pricingIssues: [],
    costCoverage: 0,
  };

  const categoryStats = {};
  const products = [];

  // Process active products for financial analysis
  if (datasets.active && datasets.active.csv) {
    const { rows } = parseCsv(datasets.active.csv);

    rows.forEach((row) => {
      const product = row;

      const cost = parseFloat(product.Cost) || 0;
      const price = parseFloat(product.Price) || 0;
      const shipping = parseFloat(product["Shipping Cost"]) || 0;
      const commission = parseFloat(product["Amazon Commission"]) || 0;
      const category = product["Main Category Id"];

      if (price > 0) {
        const revenue = price;
        const totalCost = cost + shipping + commission;
        const profit = revenue - totalCost;
        const margin = cost > 0 ? (profit / revenue) * 100 : 0;

        product.calculated = { revenue, totalCost, profit, margin };

        if (category) {
          if (!categoryStats[category]) {
            categoryStats[category] = {
              count: 0,
              totalRevenue: 0,
              totalProfit: 0,
            };
          }
          categoryStats[category].count++;
          categoryStats[category].totalRevenue += revenue;
          categoryStats[category].totalProfit += profit;
        }

        financials.totalValue += revenue;
        financials.totalCost += totalCost;
        financials.totalRevenue += revenue;

        if (margin < 0) {
          financials.pricingIssues.push({
            sku: product.SKU,
            name: product["Product Name"],
            margin: margin.toFixed(1),
          });
        }
      }

      products.push(product);
    });
  }

  // Calculate averages
  if (products.length > 0) {
    financials.avgProfitMargin =
      financials.totalRevenue > 0
        ? ((financials.totalRevenue - financials.totalCost) /
            financials.totalRevenue) *
          100
        : 0;
    financials.costCoverage =
      (products.filter((p) => parseFloat(p.Cost) > 0).length /
        products.length) *
      100;
  }

  // Top profitable categories
  financials.topProfitableCategories = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      avgProfit: stats.totalProfit / stats.count,
      totalRevenue: stats.totalRevenue,
    }))
    .sort((a, b) => b.avgProfit - a.avgProfit)
    .slice(0, 5);

  return financials;
}

function analyzeStock(datasets) {
  const stock = {
    totalProducts: 0,
    inStock: 0,
    outOfStock: 0,
    lowStock: [],
    stockDistribution: {},
    avgStockLevel: 0,
  };

  // Analyze active products stock
  if (datasets.active && datasets.active.csv) {
    const { rows } = parseCsv(datasets.active.csv);

    rows.forEach((row) => {
      const product = row;

      const stockLevel = parseInt(product.Stock) || 0;
      stock.totalProducts++;

      if (stockLevel === 0) {
        stock.outOfStock++;
      } else {
        stock.inStock++;
        if (stockLevel < 10) {
          stock.lowStock.push({
            sku: product.SKU,
            name: product["Product Name"],
            stock: stockLevel,
          });
        }
      }

      // Stock distribution
      const range =
        stockLevel === 0
          ? "0"
          : stockLevel < 10
            ? "1-9"
            : stockLevel < 50
              ? "10-49"
              : stockLevel < 100
                ? "50-99"
                : "100+";

      stock.stockDistribution[range] =
        (stock.stockDistribution[range] || 0) + 1;
    });
  }

  if (stock.totalProducts > 0) {
    stock.avgStockLevel = ((stock.inStock / stock.totalProducts) * 100).toFixed(
      1,
    );
  }

  return stock;
}

function analyzeCategories(datasets) {
  const categories = {
    distribution: {},
    topCategories: [],
    categoryPerformance: {},
    subCategoryBreakdown: {},
  };

  // Analyze active products
  if (datasets.active && datasets.active.csv) {
    const { rows } = parseCsv(datasets.active.csv);

    rows.forEach((row) => {
      const product = row;

      const mainCat = product["Main Category Id"];
      const subCat = product["Sub Category Id"];
      const price = parseFloat(product.Price) || 0;
      const rating = parseFloat(product["Review Rate"]) || 0;

      if (mainCat) {
        if (!categories.distribution[mainCat]) {
          categories.distribution[mainCat] = {
            count: 0,
            totalValue: 0,
            avgRating: 0,
            subCats: {},
          };
        }
        categories.distribution[mainCat].count++;
        categories.distribution[mainCat].totalValue += price;
        categories.distribution[mainCat].avgRating += rating;

        if (subCat) {
          categories.distribution[mainCat].subCats[subCat] =
            (categories.distribution[mainCat].subCats[subCat] || 0) + 1;
        }
      }
    });

    // Calculate averages and top categories
    Object.keys(categories.distribution).forEach((cat) => {
      const data = categories.distribution[cat];
      data.avgRating = data.avgRating / data.count;
      data.avgValue = data.totalValue / data.count;
    });

    categories.topCategories = Object.entries(categories.distribution)
      .map(([cat, data]) => ({ category: cat, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  return categories;
}

function analyzeBrands(datasets) {
  const brands = {
    distribution: {},
    topBrands: [],
    brandPerformance: {},
    avgRatingByBrand: {},
  };

  // Analyze active products
  if (datasets.active && datasets.active.csv) {
    const { rows } = parseCsv(datasets.active.csv);

    rows.forEach((row) => {
      const product = row;

      const brand = product.Brand || "Unknown";
      const price = parseFloat(product.Price) || 0;
      const rating = parseFloat(product["Review Rate"]) || 0;

      if (!brands.distribution[brand]) {
        brands.distribution[brand] = {
          count: 0,
          totalValue: 0,
          totalRating: 0,
        };
      }
      brands.distribution[brand].count++;
      brands.distribution[brand].totalValue += price;
      brands.distribution[brand].totalRating += rating;
    });

    // Calculate averages
    Object.keys(brands.distribution).forEach((brand) => {
      const data = brands.distribution[brand];
      data.avgRating = data.totalRating / data.count;
      data.avgValue = data.totalValue / data.count;
    });

    brands.topBrands = Object.entries(brands.distribution)
      .map(([brand, data]) => ({ brand, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  return brands;
}

function analyzeQuality(datasets) {
  const quality = {
    ratingDistribution: {},
    highRatedProducts: [],
    lowRatedProducts: [],
    avgRating: 0,
    ratingCoverage: 0,
    topRatedCategories: [],
  };

  // Analyze active products
  if (datasets.active && datasets.active.csv) {
    const { rows } = parseCsv(datasets.active.csv);

    let totalRating = 0;
    let ratedProducts = 0;

    rows.forEach((row) => {
      const product = row;

      const rating = parseFloat(product["Review Rate"]) || 0;
      const category = product["Main Category Id"];

      if (rating > 0) {
        ratedProducts++;
        totalRating += rating;

        // Rating distribution
        const range =
          rating >= 4.5
            ? "4.5+"
            : rating >= 4.0
              ? "4.0-4.4"
              : rating >= 3.5
                ? "3.5-3.9"
                : rating >= 3.0
                  ? "3.0-3.4"
                  : "0-2.9";
        quality.ratingDistribution[range] =
          (quality.ratingDistribution[range] || 0) + 1;

        // High/low rated products
        if (rating >= 4.5) {
          quality.highRatedProducts.push({
            sku: product.SKU,
            name: product["Product Name"],
            rating: rating,
            category: category,
          });
        } else if (rating < 3.0 && rating > 0) {
          quality.lowRatedProducts.push({
            sku: product.SKU,
            name: product["Product Name"],
            rating: rating,
            category: category,
          });
        }
      }
    });

    quality.ratingCoverage =
      rows.length > 0 ? ((ratedProducts / rows.length) * 100).toFixed(1) : 0;
    quality.avgRating =
      ratedProducts > 0 ? (totalRating / ratedProducts).toFixed(1) : 0;
  }

  return quality;
}

module.exports = {
  runAudits,
  parseCsv,
  auditFromResultsFile,
  buildPrettyReport,
  analyzeProductFlow,
  analyzeFinancials,
  analyzeStock,
  analyzeCategories,
  analyzeBrands,
  analyzeQuality,
};
