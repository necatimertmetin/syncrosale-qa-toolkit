const axios = require("axios");
const { AUTH_URL, CLIENT_ID } = require("./config");

// ❌ SABİT ENV YOK ARTIK

let accessToken = null;
let refreshToken = null;

let isRefreshing = false;
let refreshPromise = null;

/**
 * 🔥 ENV'i runtime'da oku
 */
function getEnv() {
  const username = process.env.SYNCRO_USERNAME;
  const password = process.env.SYNCRO_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Missing SYNCRO_USERNAME / SYNCRO_PASSWORD env vars. Use .env or set in shell.",
    );
  }

  return { username, password };
}

/**
 * 🟢 LOGIN
 */
async function login() {
  const { username, password } = getEnv();

  console.log("🔐 LOGIN...");

  const res = await axios.post(
    AUTH_URL,
    new URLSearchParams({
      grant_type: "password",
      client_id: CLIENT_ID,
      username,
      password,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  accessToken = res.data.access_token;
  refreshToken = res.data.refresh_token;

  console.log("✅ LOGIN SUCCESS");
  return accessToken;
}

/**
 * 🔄 REFRESH
 */
async function refreshAccessToken() {
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      console.log("🔄 REFRESH TOKEN...");

      const res = await axios.post(
        AUTH_URL,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;

      console.log("✅ TOKEN REFRESHED");
      return accessToken;
    } catch (e) {
      console.log("⚠️ REFRESH FAILED → fallback LOGIN");
      return await login();
    } finally {
      isRefreshing = false;
    }
  })();

  return refreshPromise;
}

function getAccessToken() {
  return accessToken;
}

async function initAuth() {
  if (!accessToken) await login();
}

module.exports = {
  initAuth,
  login,
  refreshAccessToken,
  getAccessToken,
};
