const { getWithAuth } = require("../../api");

const endpoints = [
  "/store/1/product/detailed2?page=0&size=100",
  "/store/1/order/optimized?page=0&size=100",
  "/store/1/notification-mail?page=0&size=100",
];

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
}

async function measure(url) {
  const start = Date.now();

  const res = await getWithAuth(url);

  const duration = Date.now() - start;

  const status = res.status;
  const data = res.data;

  const size = JSON.stringify(data || {}).length;

  console.log("\n📡 RESPONSE DEBUG");
  console.log("STATUS:", status);
  console.log("SIZE:", size, "bytes");

  const preview = JSON.stringify(data)?.slice(0, 300);
  console.log("PREVIEW:", preview);

  return {
    duration,
    formatted: formatDuration(duration),
    status,
    size,
  };
}
async function run() {
  const results = [];

  for (const ep of endpoints) {
    const { duration, formatted, status, size } = await measure(ep);

    results.push({
      endpoint: ep,
      responseTimeMs: duration,
      responseTime: formatted,
      statusCode: status,
      size,
      classification: duration > 1000 ? "SLOW ⚠️" : "OK ✅",
    });

    console.log(
      `⏱ ${ep} → ${formatted} (${duration}ms) | ${size} bytes | status ${status}`,
    );
  }

  return results;
}
module.exports = { run };
