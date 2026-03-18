/**
 * V2 Entity Validation - Main Test Runner
 * Backend-independent database validation
 * 
 * Usage:
 *   node run.js [--db-host=localhost] [--db-port=5432] [--db-name=syncro] [--db-user=postgres]
 * 
 * Environment Variables:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const pkg = require("pg");
const { Pool } = pkg;
const ora = require("ora");
const chalk = require("chalk");
const { QUERIES } = require("./queries");
const { V2EntityValidators } = require("./validators");

// Parse arguments
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.replace("--", "").split("=");
      args[key] = value;
    }
  });
  return args;
}

// Get DB config
function getDbConfig() {
  const args = parseArgs();
  return {
    host: args["db-host"] || process.env.DB_HOST || "localhost",
    port: args["db-port"] || process.env.DB_PORT || 5432,
    database: args["db-name"] || process.env.DB_NAME || "syncrosale",
    user: args["db-user"] || process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    max: 2,
    idleTimeoutMillis: 2000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000, // 30s timeout for long queries
  };
}

// Create pool
async function createPool(config) {
  const pool = new Pool(config);

  pool.on("error", (err) => {
    console.error(chalk.red(`❌ Pool error: ${err.message}`));
  });

  return pool;
}

// Test connection
async function testConnection(pool) {
  try {
    const result = await pool.query("SELECT NOW()");
    return true;
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Run validation
async function runValidations(pool) {
  const results = [];
  const validationTests = [
    // Price validations
    {
      name: "Price Order Check",
      query: QUERIES.PRICE_ORDER_VIOLATIONS,
      validator: (rows) => V2EntityValidators.validatePriceOrder(rows),
    },
    {
      name: "Price Consistency",
      query: QUERIES.PRICE_CONSISTENCY_NULLS,
      validator: (rows) => V2EntityValidators.validatePriceConsistency(rows),
    },
    {
      name: "Currency Consistency",
      query: QUERIES.CURRENCY_MISMATCH,
      validator: (rows) => V2EntityValidators.validateCurrencyConsistency(rows),
    },
    {
      name: "Profit Calculation",
      query: QUERIES.PROFIT_CALCULATION_ERRORS,
      validator: (rows) => V2EntityValidators.validateProfitCalculation(rows),
    },
    {
      name: "Missing Data Flag",
      query: QUERIES.MISSING_DATA_INCONSISTENCY,
      validator: (rows) => V2EntityValidators.validateMissingDataFlag(rows),
    },
    {
      name: "Stock Non-Negative",
      query: QUERIES.STOCK_NEGATIVE,
      validator: (rows) => V2EntityValidators.validateStockNonNegative(rows),
    },
    {
      name: "Action Enum Validity",
      query: QUERIES.INVALID_ACTION_ENUM,
      validator: (rows) => V2EntityValidators.validateActionEnum(rows),
    },

    // FK validations
    {
      name: "Marketplace Product FK",
      query: QUERIES.MARKETPLACE_MISSING_PRODUCT,
      validator: (rows) =>
        V2EntityValidators.validateMarketplaceProductFK(rows),
    },
    {
      name: "Marketplace Status",
      query: QUERIES.MARKETPLACE_INVALID_STATUS,
      validator: (rows) => V2EntityValidators.validateMarketplaceStatus(rows),
    },
    {
      name: "Offer FK",
      query: QUERIES.OFFER_MISSING_MARKETPLACE_PRODUCT,
      validator: (rows) => V2EntityValidators.validateOfferFK(rows),
    },
    {
      name: "Offer Price Non-Negative",
      query: QUERIES.OFFER_PRICE_NEGATIVE,
      validator: (rows) => V2EntityValidators.validateOfferPrice(rows),
    },
    {
      name: "Offer Handling Days",
      query: QUERIES.OFFER_HANDLING_DAYS_INVALID,
      validator: (rows) => V2EntityValidators.validateOfferHandlingDays(rows),
    },

    // Detail validations
    {
      name: "Product Detail FK",
      query: QUERIES.PRODUCT_DETAIL_MISSING_ASIN,
      validator: (rows) => V2EntityValidators.validateProductDetailFK(rows),
    },
    {
      name: "Product Detail Content",
      query: QUERIES.PRODUCT_DETAIL_ALL_BULLETS_EMPTY,
      validator: (rows) =>
        V2EntityValidators.validateProductDetailAllEmpty(rows),
    },

    // Image validations
    {
      name: "Product Image FK",
      query: QUERIES.PRODUCT_IMAGE_MISSING_ASIN,
      validator: (rows) => V2EntityValidators.validateProductImageFK(rows),
    },
    {
      name: "Product Image Rank Uniqueness",
      query: QUERIES.PRODUCT_IMAGE_DUPLICATE_RANK,
      validator: (rows) =>
        V2EntityValidators.validateProductImageDuplicateRank(rows),
    },
    {
      name: "Product Image URL",
      query: QUERIES.PRODUCT_IMAGE_INVALID_URL,
      validator: (rows) => V2EntityValidators.validateProductImageURL(rows),
    },

    // Restriction validations
    {
      name: "Product Restriction FK",
      query: QUERIES.PRODUCT_RESTRICTION_MISSING_ASIN,
      validator: (rows) =>
        V2EntityValidators.validateProductRestrictionFK(rows),
    },

    // Product V2 validations
    {
      name: "Product Status",
      query: QUERIES.PRODUCT_INVALID_STATUS,
      validator: (rows) => V2EntityValidators.validateProductStatus(rows),
    },
    {
      name: "Product Dimensions",
      query: QUERIES.PRODUCT_DIMENSION_MISMATCH,
      validator: (rows) => V2EntityValidators.validateProductDimensions(rows),
    },
  ];

  for (const test of validationTests) {
    const spinner = ora(chalk.blue(`Checking: ${test.name}`)).start();
    try {
      const { rows } = await pool.query(test.query);
      const result = test.validator(rows);

      if (result.issueCount > 0) {
        spinner.fail(
          chalk.red(`${test.name}: ${result.issueCount} issues found`)
        );
      } else {
        spinner.succeed(chalk.green(`${test.name}: ✓ OK`));
      }

      results.push(result);
    } catch (error) {
      spinner.fail(chalk.yellow(`${test.name}: Query error - ${error.message}`));
      results.push({
        checkName: test.name,
        severity: "SKIPPED",
        error: error.message,
      });
    }
  }

  return results;
}

// Get statistics
async function getStatistics(pool) {
  try {
    const { rows } = await pool.query(QUERIES.ENTITY_COUNTS);
    return V2EntityValidators.formatEntityCounts(rows);
  } catch (error) {
    return { error: error.message };
  }
}

// Generate report
function generateReport(results, statistics) {
  const criticalIssues = results.filter((r) => r.severity === "CRITICAL");
  const highIssues = results.filter((r) => r.severity === "HIGH");
  const mediumIssues = results.filter((r) => r.severity === "MEDIUM");
  const skipped = results.filter((r) => r.severity === "SKIPPED");

  const totalIssues = results.reduce((sum, r) => sum + (r.issueCount || 0), 0);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecksPassed: results.filter((r) => r.issueCount === 0).length,
      totalChecksFailed: results.filter((r) => r.issueCount > 0).length,
      skipped: skipped.length,
      totalIssuesFound: totalIssues,
      criticalCount: criticalIssues.reduce((sum, r) => sum + r.issueCount, 0),
      highCount: highIssues.reduce((sum, r) => sum + r.issueCount, 0),
      mediumCount: mediumIssues.reduce((sum, r) => sum + r.issueCount, 0),
    },
    severity: {
      CRITICAL: criticalIssues.map((r) => r.toJSON()),
      HIGH: highIssues.map((r) => r.toJSON()),
      MEDIUM: mediumIssues.map((r) => r.toJSON()),
    },
    statistics,
    fullResults: results.map((r) =>
      r.toJSON ? r.toJSON() : r
    ),
  };

  return report;
}

// Output report
function outputReport(report) {
  console.log("\n" + "=".repeat(80));
  console.log(chalk.bold.blue("V2 ENTITY VALIDATION REPORT"));
  console.log("=".repeat(80));

  console.log(chalk.bold("\n📊 SUMMARY:"));
  console.log(
    `  Passed: ${chalk.green(report.summary.totalChecksPassed)} / Total: ${
      report.summary.totalChecksPassed + report.summary.totalChecksFailed
    }`
  );
  console.log(`  Total Issues: ${chalk.bold(report.summary.totalIssuesFound)}`);
  console.log(
    `  🔴 CRITICAL: ${chalk.red(report.summary.criticalCount)} | 🟠 HIGH: ${chalk.yellow(report.summary.highCount)} | 🟡 MEDIUM: ${chalk.gray(report.summary.mediumCount)}`
  );

  if (report.summary.criticalCount > 0) {
    console.log(chalk.bold.red("\n🔴 CRITICAL ISSUES:"));
    report.severity.CRITICAL.forEach((issue) => {
      console.log(
        `  - ${chalk.red(issue.checkName)} (${issue.totalFound} found)`
      );
      issue.issues.slice(0, 3).forEach((item, i) => {
        console.log(
          `    ${i + 1}. ${JSON.stringify(item).substring(0, 100)}...`
        );
      });
      if (issue.moreIssuesExist) {
        console.log(`    ... and ${issue.totalFound - 3} more`);
      }
    });
  }

  if (report.summary.highCount > 0) {
    console.log(chalk.bold.yellow("\n🟠 HIGH PRIORITY ISSUES:"));
    report.severity.HIGH.slice(0, 3).forEach((issue) => {
      console.log(
        `  - ${chalk.yellow(issue.checkName)} (${issue.totalFound} found)`
      );
    });
  }

  console.log(chalk.bold("\n📈 ENTITY STATISTICS:"));
  Object.entries(report.statistics).forEach(([table, stats]) => {
    if (!stats.error) {
      console.log(
        `  ${table}: ${stats.total} total (${stats.active} active, ${stats.inactive} inactive)`
      );
    }
  });

  console.log("\n" + "=".repeat(80));

  // Return JSON
  console.log("\n" + chalk.dim("Full JSON Report:"));
  console.log(JSON.stringify(report, null, 2));
}

// Main
async function main() {
  const config = getDbConfig();
  let pool;

  try {
    console.log(chalk.blue("🔌 Connecting to database..."));
    console.log(
      `   Host: ${config.host}:${config.port}, Database: ${config.database}`
    );

    pool = await createPool(config);
    await testConnection(pool);
    console.log(chalk.green("✓ Connection successful\n"));

    console.log(chalk.blue("🔍 Running V2 Entity Validations...\n"));
    const validationResults = await runValidations(pool);

    console.log(chalk.blue("\n📊 Gathering statistics...\n"));
    const statistics = await getStatistics(pool);

    const report = generateReport(validationResults, statistics);
    outputReport(report);

    // Exit code based on critical issues
    const hasCritical =
      report.summary.criticalCount > 0 || report.summary.totalChecksFailed > 0;
    process.exit(hasCritical ? 1 : 0);
  } catch (error) {
    console.error(chalk.red.bold(`\n❌ ERROR: ${error.message}`));
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
