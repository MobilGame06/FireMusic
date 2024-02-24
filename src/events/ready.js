const client = require("../index");
var colors = require('colors');
const {ActivityType } = require('discord.js');


client.on("raw", d => client.lavalink.sendRawData(d));
client.on("ready", async () => {
  await client.lavalink.init({ ...client.user });
  console.log("[LavaLink] Connected to Lavalink".green);
  console.log("-----------------------------------------------".yellow);
  console.log(`${client.user.tag} is up and ready to go!`.brightWhite);
  console.log("-----------------------------------------------".yellow);
  client.user.setPresence({
    activities: [{ name: `music`, type: ActivityType.Listening }],
    status: 'online',
    afk: false,
  });
});