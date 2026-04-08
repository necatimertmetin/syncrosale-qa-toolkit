/**
 * Maps items concurrently with a worker-pool pattern.
 * No ESM dependency — pure CJS.
 */
async function mapConcurrent(items, fn, concurrency = 5) {
  const results = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

module.exports = { mapConcurrent };
