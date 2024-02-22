require("dotenv").config();
const { LavalinkManager } = require("lavalink-client");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { nodes } = require('../lavaConfig.js');

const client = new Client({
    intents: [32767]
});

console.log(nodes)

client.lavalink = new LavalinkManager({
    nodes: [
      {
        host: nodes.host,
        port: parseInt(nodes.port),
        authorization: nodes.authenticaion,
        secure: nodes.secure
      }
    ],
    sendToShard: (guildId, payload) =>
      client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
      id: process.env.CLIENT_ID, 
      username: "TESTBOT",
    },
  });
  

module.exports = client;

// Global Variables
client.commands = new Collection();
client.slashCommands = new Collection();

// Initializing the project
require("./handler")(client);

client.login(process.env.TOKEN);