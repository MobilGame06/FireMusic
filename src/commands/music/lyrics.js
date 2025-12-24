const { genericChecks } = require("../../utilities/checks.js");
const { simpleEmbed } = require("../../utilities/embeds.js");
const { getLyrics } = require("genius-lyrics-api");

function cleanMeta(str = "") {
    return str
        .replace(/\(.*?\)/g, "")
        .replace(/\[.*?]/g, "")
        .replace(/official\s*(music)?\s*video/gi, "")
        .replace(/lyrics?/gi, "")
        .replace(/audio/gi, "")
        .replace(/HD|4K/gi, "")
        .replace(/full\s*song/gi, "")
        .replace(/feat\.?|ft\.?/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

module.exports = {
    name: "lyrics",
    description: "shows the lyrics of the current track",
    inVc: true,
    sameVc: true,
    run: async (client, interaction) => {
        if (!genericChecks(interaction)) return;

        const player = interaction.client.lavalink.getPlayer(interaction.guild.id);
        if (!player?.queue?.current) {
            return interaction.editReply(
                simpleEmbed("There is no song playing.", true, interaction.client)
            );
        }

        const track = player.queue.current;

        const rawTitle = track.info?.title || "";
        const rawArtist = track.info?.author || "";

        const title = cleanMeta(rawTitle);
        const artist = cleanMeta(rawArtist);

        const baseOptions = {
            apiKey: process.env.GENIUS_API_KEY,
            optimizeQuery: true
        };

        let lyrics = await getLyrics({
            ...baseOptions,
            title,
            artist
        }).catch(() => null);

        if (!lyrics) {
            lyrics = await getLyrics({
                ...baseOptions,
                title
            }).catch(() => null);
        }

        if (!lyrics) {
            const shortTitle = title.split("-")[0].split("|")[0].trim();
            if (shortTitle && shortTitle.length >= 3 && shortTitle !== title) {
                lyrics = await getLyrics({
                    ...baseOptions,
                    title: shortTitle
                }).catch(() => null);
            }
        }

        if (!lyrics) {
            return interaction.editReply(
                simpleEmbed("Lyrics not found.", true, interaction.client)
            );
        }

        return interaction.editReply(simpleEmbed(lyrics, true, interaction.client));
    }
};