const readline = require("readline");
const chalk = require("chalk").default;
const { getCurrentAccount } = require("../auth");
let keypressHandler = null;

function sanitizePath(input) {
  if (!input) return input;

  let val = input.trim();
  val = val.replace(/^&\s*/, "");
  val = val.replace(/^['"]+|['"]+$/g, "");
  val = val.replace(/[\r\n]+/g, "");
  val = val.replace(/\\"/g, '"');

  return val;
}

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
}

function removeKeypressHandler(handler) {
  if (!handler) return;
  process.stdin.removeListener("keypress", handler);
}

function ensureRawMode(on = true) {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(on);
  }
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
  if (name.includes("Product")) return "📊 ";
  if (name.includes("Order")) return "🧾 ";
  if (name.includes("Buyable")) return "📦 ";
  if (name.includes("Security")) return "🛡️ ";
  if (name.includes("Rate")) return "🚦 ";
  if (name.includes("Error")) return "🐞 ";
  if (name.includes("Auth")) return "🔐 ";
  if (name.includes("Account")) return "👤 ";
  if (name.includes("Clear All Reports")) return "🗑️ ";
  return "🔹 ";
}
function colorTag(tag) {
  switch (tag) {
    case "critical":
      return chalk.bgRed.white.bold(` ${tag} `);

    case "finance":
      return chalk.yellowBright(`[${tag}]`);

    case "catalog":
      return chalk.cyanBright(`[${tag}]`);

    case "pricing":
      return chalk.magentaBright(`[${tag}]`);

    case "margin":
      return chalk.greenBright(`[${tag}]`);

    case "orders":
      return chalk.blueBright(`[${tag}]`);

    case "latency":
      return chalk.yellow(`[${tag}]`);

    case "security":
      return chalk.redBright(`[${tag}]`);

    case "traffic":
      return chalk.magenta(`[${tag}]`);

    case "validation":
      return chalk.green(`[${tag}]`);

    case "cleanup":
      return chalk.gray(`[${tag}]`);

    default:
      return chalk.white(`[${tag}]`);
  }
}

function createCLI({ tools, onSelect, onExit }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let selectedIndex = 0;

  readline.emitKeypressEvents(process.stdin);
  ensureRawMode(true);

  // 🔥 CTRL+C GLOBAL
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n👋 Force exit"));

    ensureRawMode(false);
    removeKeypressHandler(keypressHandler);
    rl.close();

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
    console.log(
      chalk.gray("👤 ACCOUNT: ") +
        chalk.bgBlue.white.bold(` ${getCurrentAccount()} `),
    );

    console.log(chalk.gray("🕒 ") + chalk.white(new Date().toLocaleString()));

    console.log(chalk.gray("=".repeat(60)));
  }

  function renderMenu() {
    process.stdout.write("\x1b[?25l");
    clearScreen();
    printHeader();

    let lastSection = null;

    tools.forEach((tool, i) => {
      const isSelected = i === selectedIndex;
      const icon = getToolIcon(tool.name);

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
      const nameWidth = 34;

      const paddedName = tool.name.padEnd(nameWidth);

      const tagStr = tool.tags?.length ? tool.tags.map(colorTag).join(" ") : "";
      if (isSelected) {
        console.log(
          chalk.bgCyan.black(` ${icon} ${paddedName}`) +
            chalk.bgCyan.black(` ${tagStr}`) +
            " ",
        );
      } else {
        console.log(
          chalk.whiteBright(`    ${icon} ${paddedName}`) + chalk.white(tagStr),
        );
      }
    });

    const selected = tools[selectedIndex];

    if (selected?.description) {
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
    process.stdout.write("\x1b[?25h"); // show cursor
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
    ensureRawMode(true);
    removeKeypressHandler(keypressHandler);

    renderMenu();

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
        removeKeypressHandler(keypressHandler);
        clearScreen();
        await handleSelect();
      }

      if (key.name === "q") {
        ensureRawMode(false);
        rl.close();
        onExit?.();
      }
    };

    process.stdin.on("keypress", keypressHandler);
  }

  function waitReturn() {
    console.log(chalk.gray("\n↩ Press ENTER to return menu..."));

    removeKeypressHandler(keypressHandler);

    keypressHandler = (_, key) => {
      if (key.name === "return") {
        removeKeypressHandler(keypressHandler);
        selectedIndex = 0;
        start();
      }

      if (key.ctrl && key.name === "c") {
        ensureRawMode(false);
        rl.close();
        process.exit(0);
      }
    };

    process.stdin.on("keypress", keypressHandler);
  }

  function confirm(message, callback) {
    let confirmIndex = 0;

    removeKeypressHandler(keypressHandler);

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

    keypressHandler = (_, key) => {
      if (key.name === "left" || key.name === "right") {
        confirmIndex = confirmIndex === 0 ? 1 : 0;
        renderConfirm();
      }

      if (key.name === "return") {
        removeKeypressHandler(keypressHandler);
        clearScreen();
        callback(confirmIndex === 1);
      }
    };

    process.stdin.on("keypress", keypressHandler);
  }

  function ask(question, callback) {
    ensureRawMode(false);

    rl.question(question, (answer) => {
      ensureRawMode(true);

      const cleaned = sanitizePath(answer);
      callback(cleaned);
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
