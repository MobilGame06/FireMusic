const client = require("../index");
const {updatePlayer, addMusicControls } = require("../utilities/lavalink.js");
const { errorEmbed, simpleEmbed } = require("../utilities/embeds.js");

client.lavalink.on("trackStart", (player, track) => {
    console.log(`[Lavalink] Track started: ${track.info.title} - ${track.info.author} - ${track.info.uri}`)
})