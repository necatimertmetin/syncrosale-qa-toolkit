module.exports = {
  API_BASE: process.env.SYNCRO_API_URL || "https://api.syncrosale.com/api/v1",
  AUTH_URL:
    process.env.SYNCRO_AUTH_URL ||
    "https://auth.syncrosale.com/realms/syncrosale/protocol/openid-connect/token",
  CLIENT_ID: process.env.SYNCRO_CLIENT_ID || "syncrosale",

  // Hedef endpoint(ler)
  STORE_ID: 1,
  PRODUCT_PATH: (storeId, asin) => `/store/${storeId}/product/${asin}`,

  // Test datası (benign)
  KNOWN_GOOD_ASIN: "b0clpm6gqd", // sende çalışan bir örnek
  OTHER_STORE_IDS_TO_TEST: [2, 3, 99],

  // Concurrency (agresif değil)
  CONCURRENCY: 50,

  // CSV/rapor
  OUT_DIR: "./results",
};
