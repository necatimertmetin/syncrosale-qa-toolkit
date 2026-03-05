async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("bu benim toolumun input yeri", (gelenVeri) => {
      if (gelenVeri) {
        console.log("ben bir tool kodladim", gelenVeri);
        const summary = {
          type: "SUMMARY",
          total: gelenVeri,
        };
        const results = {
          type: "total results:",
          total: gelenVeri,
        };
        return resolve([summary, results]);
      }
      console.log("sen hicbir sey yazmadin bana");
      return resolve([]);
    });
  });
}

module.exports = { run };
