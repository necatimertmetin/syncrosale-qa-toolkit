const axios = require("axios");
const ora = require("ora").default;
const chalk = require("chalk").default;

const { API_BASE } = require("./config");
const { getAccessToken, refreshAccessToken } = require("./auth");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "en",
    "User-Agent": "QA-TEST/1.0",
  };
}

// 🔥 status → color mapper
function getStatusColor(status) {
  if (status >= 500) return chalk.red;
  if (status >= 400) return chalk.yellow;
  if (status >= 300) return chalk.cyan;
  return chalk.green;
}

// 🔥 status → label
function getStatusLabel(status) {
  if (status >= 500) return "SERVER_ERROR";
  if (status >= 400) return "CLIENT_ERROR";
  if (status >= 300) return "REDIRECT";
  return "OK";
}

async function get(path, retries = 2, options = {}) {
  const { silent = false } = options;

  const token = getAccessToken();
  if (!token) throw new Error("No access token (did you call initAuth?)");

  const url = `${API_BASE}${path}`;

  let spinner = null;

  if (!silent) {
    spinner = ora({
      text: `Requesting ${path}`,
      spinner: "dots",
    }).start();
  }

  try {
    const res = await axios.get(url, {
      headers: buildHeaders(token),
      validateStatus: () => true,
    });

    const color = getStatusColor(res.status);
    const label = getStatusLabel(res.status);

    if (!silent) {
      spinner.succeed(
        `${color(res.status)} ${chalk.gray(`(${label})`)} ${chalk.white(path)}`,
      );

      const contentType = res.headers["content-type"] || "";
      console.log("📦", chalk.gray("CONTENT-TYPE:"), chalk.white(contentType));

      // 🚨 HTML anomaly detection
      if (
        typeof res.data === "string" &&
        res.data.toLowerCase().includes("<!doctype html>")
      ) {
        console.log(
          chalk.red("🚨 HTML RESPONSE → WRONG ENDPOINT / GATEWAY / AUTH ISSUE"),
        );
      }

      // 🔍 preview
      let preview;
      try {
        preview =
          typeof res.data === "string"
            ? res.data.slice(0, 200)
            : JSON.stringify(res.data)?.slice(0, 200);
      } catch {
        preview = "[unserializable response]";
      }

      console.log("🔎", chalk.gray("PREVIEW:"), chalk.dim(preview));
    }

    return res;
  } catch (e) {
    if (!silent && spinner) {
      spinner.fail(chalk.red(`❌ ${path} → ${e.message}`));
    }
    throw e;
  }
}

async function getWithAuth(path, retries = 2, options = {}) {
  const { silent = false } = options;

  const res = await get(path, retries, options);

  // 🔐 TOKEN EXPIRED
  if (res.status === 401 && retries > 0) {
    if (!silent) {
      console.log(chalk.yellow("⚠️ 401 → refreshing token..."));
    }

    await refreshAccessToken();
    return getWithAuth(path, retries - 1, options);
  }

  // 🚦 RATE LIMIT
  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers?.["retry-after"] || 2);

    if (!silent) {
      const spinner = ora(
        chalk.yellow(`Rate limited → retrying in ${retryAfter}s`),
      ).start();

      await sleep(retryAfter * 1000);
      spinner.stop();
    } else {
      await sleep(retryAfter * 1000);
    }

    return getWithAuth(path, retries - 1, options);
  }

  return res;
}

module.exports = { getWithAuth };
