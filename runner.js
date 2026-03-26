const env = process.argv[2] || "dev";
require("dotenv").config({ path: `.env.${env}` });

const { createCLI } = require("./src/cli/menu");
const { tools } = require("./src/cli/tools");
const { selectAccount } = require("./src/cli/selectAccount");
const { runTool } = require("./src/cli/runTool");
const { deleteAllReports } = require("./src/report/reporter");

const cli = createCLI({
  tools,

  onSelect: async (selected, showMenu) => {
    if (selected.type === "account") {
      await selectAccount();
      return showMenu();
    }

    if (selected.type === "danger") {
      return cli.confirm("This will DELETE ALL REPORTS!", (confirmed) => {
        if (confirmed) deleteAllReports();
        setTimeout(showMenu, 800);
      });
    }

    try {
      console.log(`\n🚀 Running: ${selected.name}\n`);
      await runTool(selected, cli);
    } catch (e) {
      console.log("❌ ERROR:", e.message);
    }

    cli.waitReturn();
  },

  onExit: () => process.exit(0),
});

(async () => {
  await selectAccount();
  cli.start();
})();
