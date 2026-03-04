function indexByAsin(data) {
  const map = new Map();

  data.forEach((item) => {
    if (item.asin) {
      map.set(item.asin, item);
    }
  });

  return map;
}

module.exports = { indexByAsin };
