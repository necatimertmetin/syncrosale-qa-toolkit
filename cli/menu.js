const readline = require("readline");
const chalk = require("chalk").default;

let keypressHandler = null;

function createCLI({ tools, onSelect, onExit }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let selectedIndex = 0;

  readline.emitKeypressEvents(process.stdin, rl);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  // GLOBAL CTRL+C HANDLER
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n👋 Force exit"));

    try {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    } catch {}

    rl.close();
    onExit?.();
    process.exit(0);
  });

  function printHeader() {
    console.log(chalk.gray("=".repeat(50)));
    console.log(chalk.bold.cyan("🧪 SYNCRO QA TOOLKIT"));
    console.log(chalk.gray("=".repeat(50)));
    console.log(chalk.gray(`🌐 API: ${process.env.SYNCRO_API_URL}`));
    console.log(chalk.gray(`🕒 ${new Date().toLocaleString()}`));
    console.log("");
  }

  function renderMenu() {
    console.clear();
    printHeader();

    tools.forEach((tool, i) => {
      const isSelected = i === selectedIndex;

      if (isSelected) {
        console.log(chalk.bgCyan.black(` 👉 ${tool.name} `));
      } else {
        console.log(chalk.gray(`    ${tool.name}`));
      }
    });

    console.log(chalk.gray("\n↑ ↓ navigate • ENTER select • q exit"));
  }

  async function handleSelect() {
    const selected = tools[selectedIndex];

    try {
      await onSelect(selected, start);
    } catch (e) {
      console.log(chalk.red("❌ ERROR:"), e.message);
    }
  }

  function start() {
    renderMenu();

    // 🔥 önce eski listener'ı temizle
    if (keypressHandler) {
      process.stdin.removeListener("keypress", keypressHandler);
    }

    keypressHandler = async (_, key) => {
      if (key.name === "up") {
        selectedIndex =
          selectedIndex === 0 ? tools.length - 1 : selectedIndex - 1;
        renderMenu();
      }

      if (key.name === "down") {
        selectedIndex =
          selectedIndex === tools.length - 1 ? 0 : selectedIndex + 1;
        renderMenu();
      }

      if (key.name === "return") {
        process.stdin.removeListener("keypress", keypressHandler);
        console.clear();
        await handleSelect();
      }

      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        console.log(chalk.yellow("👋 Exiting..."));
        rl.close();
        onExit?.();
      }
    };

    process.stdin.on("keypress", keypressHandler);
  }

  function waitReturn() {
    console.log(chalk.gray("\n↩ Press ENTER to return menu..."));

    process.stdin.removeAllListeners("keypress");

    const handler = (_, key) => {
      if (key.name === "return") {
        process.stdin.removeListener("keypress", handler);
        selectedIndex = 0;
        start();
      }

      // 🔥 FIX: CTRL+C handling
      if (key.ctrl && key.name === "c") {
        console.log(chalk.yellow("\n👋 Exiting..."));

        process.stdin.setRawMode(false); // 🔥 kritik
        rl.close();
        process.exit(0);
      }
    };

    process.stdin.on("keypress", handler);
  }
  // 🔥 NEW: Arrow-based confirm prompt
  function confirm(message, callback) {
    let confirmIndex = 0;

    process.stdin.removeAllListeners("keypress"); // 🔥 EKLE

    function renderConfirm() {
      console.clear();
      printHeader();

      console.log(chalk.yellow("⚠️ " + message + "\n"));

      const yes =
        confirmIndex === 0 ? chalk.bgGreen.black(" YES ") : chalk.gray(" YES ");

      const no =
        confirmIndex === 1 ? chalk.bgRed.black(" NO ") : chalk.gray(" NO ");

      console.log(`${yes}   ${no}`);
      console.log(chalk.gray("\n← → switch • ENTER select"));
    }

    renderConfirm();

    const handler = (_, key) => {
      if (key.name === "left" || key.name === "right") {
        confirmIndex = confirmIndex === 0 ? 1 : 0;
        renderConfirm();
      }

      if (key.name === "return") {
        process.stdin.removeListener("keypress", handler);
        console.clear();
        callback(confirmIndex === 0);
      }
    };

    process.stdin.on("keypress", handler);
  }

  function ask(question, callback) {
    process.stdin.setRawMode(false);

    rl.question(question, (answer) => {
      process.stdin.setRawMode(true);
      callback(answer);
    });
  }

  return {
    start,
    waitReturn,
    ask,
    confirm, // 👈 expose this
  };
}

module.exports = { createCLI };
