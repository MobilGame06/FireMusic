require("dotenv").config();
const { glob } = require("glob");
const colors = require("colors");
const path = require("path");

const isDev = process.env.APP_ENV === "dev";

module.exports = async (client) => {
  console.log("-".repeat(45).yellow);

  // Slash Commands
  const slashCommands = await glob(`${process.cwd()}/src/commands/**/*.js`);
  if (isDev) console.log("Found slash command files:", slashCommands);

  const arrayOfSlashCommands = slashCommands.map((value) => {
    const filePath = path.resolve(value);
    const file = require(filePath);

    const directory = path.basename(path.dirname(filePath));

    if (!file?.name) return;
    const properties = { directory, ...file };
    client.slashCommands.set(file.name, properties);

    if (["MESSAGE", "USER"].includes(file.type)) delete file.description;

    console.log(`[CommandSystem] Loaded slash command: ${file.name}`.green);
    return file;
  });

  console.log("-".repeat(45).yellow);

  // Events
  const eventFiles = await glob(`${process.cwd()}/src/events/*.js`);
  eventFiles.forEach((value) => {
    const filePath = path.resolve(value);
    const file = require(filePath);
    const eventName = path.basename(filePath, ".js");

    console.log(`[EventSystem] Loaded event: ${eventName}`.green);
    if (typeof file === "function") {
      file(client);
    }
  });

  console.log("-".repeat(45).yellow);

  // Slash Commands Register
  client.once("clientReady", async () => {
    await client.application.commands.set(arrayOfSlashCommands);
    console.log(
      `[SlashCommandSystem] Registered ${client.slashCommands.size} slash commands`.green
    );
    console.log('-'.repeat(45).yellow);
    console.log("🔥 Welcome to FireMusic 🔥".bold.brightMagenta);
  });
};