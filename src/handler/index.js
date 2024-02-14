require("dotenv").config();
const { glob } = require("glob");
const { promisify } = require("util");
var colors = require('colors');
// const mongoose = require("mongoose");
const globPromise = promisify(glob);


module.exports = async (client) => {
  console.log("-".repeat(45).yellow);
  // Slash Commands
  const slashCommands = await globPromise(
    `${process.cwd()}/src/commands/**/*.js`
  );
  const arrayOfSlashCommands = slashCommands.map((value) => {
    const file = require(value);
    const splitted = value.split("/");
    const directory = splitted[splitted.length - 2];
    if (!file?.name) return;
    const properties = { directory, ...file };
    client.slashCommands.set(file.name, properties);
    if (["MESSAGE", "USER"].includes(file.type)) delete file.description;
    console.log(`[CommandSystem] Loaded slash command: ${file.name}`.green);
    return file;
  });
  console.log("-".repeat(45).yellow);
  // Events
  const eventFiles = await globPromise(`${process.cwd()}/src/events/*.js`);
  eventFiles.forEach((value) => {
    const file = require(value);
    const eventName = value.split("/").pop().split(".")[0];
    console.log(`[EventSystem] Loaded event: ${eventName}`.green);
    require(value);
  });
  console.log("-".repeat(45).yellow);
  // Slash Commands Register
  client.on("ready", async () => {
    // Register for all the guilds the bot is in
    await client.application.commands.set(arrayOfSlashCommands);
    console.log(`[SlashCommandSystem] Registered ${client.slashCommands.size} slash commands`.green);
  });

  // mongoose
  // const mongooseConnectionString = process.env.mongooseConnectionString;
  // if (!mongooseConnectionString) return;

  // mongoose.connect(mongooseConnectionString).then(() => console.log("Connected to mongodb"));
};