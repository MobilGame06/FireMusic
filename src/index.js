require("dotenv").config();
const { LavalinkManager } = require("lavalink-client");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [32767]
});

client.lavalink = new LavalinkManager({
  nodes: [
    { // Important to have at least 1 node
      authorization: "youshallnotpass",
      host: "borneo.alfari.id",
      port: 39001,
      id: "testnode"
  }
  ],
  sendToShard: (guildId, payload) =>
        client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
        id: process.env.CLIENT_ID, username: "TESTBOT",
    },
});

module.exports = client;

// Global Variables
client.commands = new Collection();
client.slashCommands = new Collection();

// Initializing the project
require("./handler")(client);

client.login(process.env.TOKEN);