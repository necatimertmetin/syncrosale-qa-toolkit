const readline = require("readline");
const chalk = require("chalk").default;

let keypressHandler = null;

function clearScreen() {
  console.clear();
}
function getImpactColor(impact) {
  switch (impact) {
    case "HIGH":
      return chalk.red.bold;
    case "MEDIUM":
      return chalk.yellow;
    case "LOW":
      return chalk.green;
    case "DANGER":
      return chalk.bgRed.white.bold;
    default:
      return chalk.gray;
  }
}

function getToolIcon(name) {
  if (name.includes("Performance")) return "⚡ ";
  if (name.includes("Reconciliation")) return "🔄 ";
  if (name.includes("Profit")) return "💰 ";
  if (name.includes("Buyable")) return "📦 ";
  if (name.includes("Security")) return "🛡️ ";
  if (name.includes("Rate")) return "🚦 ";
  if (name.includes("Error")) return "🐞 ";
  if (name.includes("Auth")) return "🔐 ";
  return "🔹 ";
}

function createCLI({ tools, onSelect, onExit }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let selectedIndex = 0;

  readline.emitKeypressEvents(process.stdin, rl);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  // GLOBAL CTRL+C HANDLER
  process.on("SIGINT", async () => {
    console.log(chalk.yellow("\n👋 Force exit (cleaning up...)"));

    try {
      // 🔥 stdin raw mode kapat
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }

      // 🔥 tüm listener'ları temizle
      process.stdin.removeAllListeners("keypress");

      // 🔥 readline kapat
      rl.close();

      // 🔥 stdout flush (çok kritik)
      await new Promise((resolve) => process.stdout.write("", resolve));

      // 🔥 stderr flush
      await new Promise((resolve) => process.stderr.write("", resolve));

      // 🔥 GC (varsa)
      if (global.gc) {
        global.gc();
      }
    } catch (err) {
      console.log("Cleanup error:", err.message);
    }

    onExit?.();
    process.exit(0);
  });

  function printHeader() {
    console.log(chalk.gray("=".repeat(60)));
    console.log(chalk.bold.cyan("🧪 SYNCRO QA TOOLKIT"));
    console.log(chalk.gray("=".repeat(60)));

    console.log(
      chalk.gray("🌐 API: ") + chalk.white(process.env.SYNCRO_API_URL),
    );

    console.log(chalk.gray("🕒 ") + chalk.white(new Date().toLocaleString()));

    console.log(chalk.gray("=".repeat(60)));
  }

  function renderMenu() {
    clearScreen();
    printHeader();

    let lastSection = null;

    tools.forEach((tool, i) => {
      const isSelected = i === selectedIndex;
      const icon = getToolIcon(tool.name);

      // 🔥 SECTION HEADER
      if (tool.section !== lastSection) {
        lastSection = tool.section;

        console.log(
          chalk.gray("\n" + "━".repeat(20)) +
            " " +
            chalk.bold.white(tool.section) +
            " " +
            chalk.gray("━".repeat(20)),
        );
      }

      if (isSelected) {
        console.log(chalk.bgCyan.black(` ${icon} ${tool.name} `));
      } else {
        console.log(chalk.whiteBright(`    ${icon} ${tool.name}`));
      }
    });

    // 🔥 TOOL DETAILS (aynı kalıyor)
    const selected = tools[selectedIndex];

    if (selected && selected.description) {
      console.log(chalk.gray("\n" + "-".repeat(50)));

      console.log(
        chalk.white(`🧠 Description: `) + chalk.dim(selected.description),
      );

      if (selected.input) {
        console.log(chalk.cyan("📥 Input: ") + chalk.white(selected.input));
      }

      if (selected.output) {
        console.log(chalk.green("📤 Output: ") + chalk.white(selected.output));
      }

      if (selected.impact) {
        const impactColor = getImpactColor(selected.impact);

        console.log(
          chalk.white.bold("⚠ Impact: ") + impactColor(` ${selected.impact} `),
        );
      }
    }

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
        clearScreen();
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
  function confirm(message, callback) {
    let confirmIndex = 0; // 0 = NO (default)
    process.stdin.removeAllListeners("keypress");

    function renderConfirm() {
      clearScreen();
      printHeader();

      console.log(chalk.yellow("⚠️ " + message + "\n"));

      const no =
        confirmIndex === 0
          ? chalk.bgRed.black.bold(" NO ")
          : chalk.gray(" NO ");

      const yes =
        confirmIndex === 1
          ? chalk.bgGreen.black.bold(" YES ")
          : chalk.gray(" YES ");

      console.log(`${no} ${yes}`);
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
        clearScreen();
        callback(confirmIndex === 1);
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
    confirm,
  };
}

module.exports = { createCLI };
