const readline = require("readline");
const chalk = require("chalk").default;
const { setAccount, accounts } = require("../auth");

async function selectAccount() {
  const names = Object.keys(accounts);
  let selectedIndex = 0;

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  return new Promise((resolve) => {
    const render = () => {
      process.stdout.write("\x1b[2J\x1b[H");

      console.log(chalk.gray("=".repeat(60)));
      console.log(chalk.bold.cyan("🧪 SYNCRO QA TOOLKIT"));
      console.log(chalk.gray("=".repeat(60)));

      console.log(chalk.white("\n👤 Select Account\n"));

      names.forEach((name, i) => {
        const selected = i === selectedIndex;

        console.log(
          selected
            ? chalk.bgCyan.black(`  👤 ${name}  `)
            : chalk.whiteBright(`    👤 ${name}`),
        );
      });

      console.log(chalk.gray("\n↑ ↓ navigate • ENTER select"));
    };

    const handler = (_, key) => {
      if (key.name === "up") {
        selectedIndex = selectedIndex ? selectedIndex - 1 : names.length - 1;
        render();
      }

      if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % names.length;
        render();
      }

      if (key.name === "return") {
        process.stdin.removeListener("keypress", handler);
        process.stdin.setRawMode(false);

        const selected = names[selectedIndex];
        setAccount(selected);

        console.clear();
        console.log(`✅ Using account: ${chalk.cyan(selected)}\n`);

        resolve();
      }
    };

    process.stdin.on("keypress", handler);
    render();
  });
}

module.exports = { selectAccount };
