const axios = require("axios");
const { AUTH_URL, CLIENT_ID } = require("./config");
const accounts = require("../config/accounts.json");

let accessToken = null;
let refreshToken = null;
let currentStoreId = null;

let currentAccount = null;

let isRefreshing = false;
let refreshPromise = null;

function decodeJwtPayload(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    return JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function resolveStoreId(token) {
  const payload = decodeJwtPayload(token);
  // Try common claim names Keycloak/Syncrosale might use
  const fromToken =
    payload.storeId ?? payload.store_id ?? payload.store ?? null;
  if (fromToken !== null && fromToken !== undefined) return Number(fromToken);
  // Fall back to accounts.json storeId
  if (currentAccount?.storeId !== undefined && currentAccount.storeId !== null)
    return Number(currentAccount.storeId);
  return null;
}

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
  currentStoreId = resolveStoreId(accessToken);

  console.log("✅ LOGIN SUCCESS");
  if (currentStoreId !== null) {
    console.log(`🏪 Store ID: ${currentStoreId}`);
  } else {
    console.log(
      '⚠️  Store ID not found in token — add "storeId" to this account in config/accounts.json',
    );
  }

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
      currentStoreId = resolveStoreId(accessToken);

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

function getStoreId() {
  if (currentStoreId === null) {
    throw new Error(
      'Store ID could not be resolved. Add "storeId" to this account in config/accounts.json.',
    );
  }
  return currentStoreId;
}

async function initAuth() {
  if (!accessToken) await login();
}

module.exports = {
  initAuth,
  login,
  refreshAccessToken,
  getAccessToken,
  getStoreId,
  setAccount,
  getCurrentAccount,
  accounts,
};
