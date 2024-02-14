const client = require("../index");
var colors = require('colors');


client.on("raw", d => client.lavalink.sendRawData(d));
client.on("ready", async () => {
  console.log(`${client.user.tag} is up and ready to go!`.brightWhite);
  console.log("-----------------------------------------------".yellow);
  await client.lavalink.init({ ...client.user });
});