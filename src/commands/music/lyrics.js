const { genericChecks } = require("../../utilities/checks.js");
const { simpleEmbed } = require("../../utilities/embeds.js");
const { getLyrics, getSong } = require("genius-lyrics-api");

module.exports = {
    name: "lyrics",
    description: "shows the lyrics of the current track",
    inVc: true,
    sameVc: true,
    run: async (client, interaction) => {
        if (!genericChecks(interaction)) {
            return;
        }
        const player = interaction.client.lavalink.getPlayer(interaction.guild.id);

        if (!player.queue.current) {
            return await interaction.editReply(simpleEmbed('There is no song playing.', true, interaction.client));
        }

        const track = player.queue.current;

        const cleanedTitle = track.info.title.replace(/\s*\([^)]*\)/g, "").trim();

        const options = {
            apiKey: process.env.GENIUS_API_KEY,
            title: cleanedTitle,
            artist: track.info.author,
            optimizeQuery: true
        };

        const lyrics = await getLyrics(options);

        if (!lyrics) {
            return await interaction.editReply(simpleEmbed('Lyrics not found.', true, interaction.client));
        }
        await interaction.editReply(simpleEmbed(lyrics, true, interaction.client));
    },
}
