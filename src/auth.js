const axios = require("axios");
const { AUTH_URL, CLIENT_ID } = require("./config");
const accounts = require("../config/accounts.json");

let accessToken = null;
let refreshToken = null;

let currentAccount = null;

let isRefreshing = false;
let refreshPromise = null;

function setAccount(name) {
  const acc = accounts[name];

  if (!acc) {
    throw new Error(`Account not found: ${name}`);
  }

  currentAccount = acc;
}

function getCurrentAccount() {
  return currentAccount?.username || "none";
}

/**
 * 🟢 LOGIN
 */
async function login() {
  if (!currentAccount) {
    throw new Error("No account selected");
  }

  const { username, password } = currentAccount;

  console.log(`🔐 LOGIN (${username})`);

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
  setAccount,
  getCurrentAccount,
  accounts,
};
