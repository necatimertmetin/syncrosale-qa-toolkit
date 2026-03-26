const axios = require("axios");
const ora = require("ora").default;
const _chalk = require("chalk");
const chalk = _chalk.default || _chalk;

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

function getStatusColor(status) {
  if (status >= 500) return chalk.red;
  if (status >= 400) return chalk.yellow;
  if (status >= 300) return chalk.cyan;
  return chalk.green;
}

function getStatusLabel(status) {
  if (status >= 500) return "SERVER_ERROR";
  if (status >= 400) return "CLIENT_ERROR";
  if (status >= 300) return "REDIRECT";
  return "OK";
}

/* =========================================================
   MAIN GET
   ========================================================= */

async function get(path, retries = 2, options = {}) {
  const { silent = false, ...axiosOptions } = options;

  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const url = `${API_BASE}${path}`;

  let spinner = null;

  if (!silent) {
    spinner = ora({
      text: `Requesting ${path}`,
      spinner: "dots",
    }).start();
  }

  const { headers: customHeaders, ...rest } = axiosOptions;

  try {
    const res = await axios.get(url, {
      headers: {
        ...buildHeaders(token),
        ...customHeaders,
      },
      ...rest,
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

      let preview;
      try {
        preview =
          typeof res.data === "string"
            ? res.data.slice(0, 200)
            : JSON.stringify(res.data)?.slice(0, 200);
      } catch {
        preview = "[unserializable]";
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

/* =========================================================
   AUTH WRAPPER
   ========================================================= */

async function getWithAuth(path, retries = 2, options = {}) {
  const { silent = false } = options;

  const res = await get(path, retries, options);

  if (res.status === 401 && retries > 0) {
    if (!silent) console.log(chalk.yellow("⚠️ Refreshing token..."));

    await refreshAccessToken();
    return getWithAuth(path, retries - 1, options);
  }

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
