const { updatePlayer } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const { simpleEmbed } = require("../../utilities/embeds.js");
const radioMetadataService = require("../../utilities/radioMetadataService");
const liveLyrics = require("../../utilities/liveLyricsService.js");
module.exports = {
  name: "stop",
  description: 'stops the player',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    if (radioMetadataService.isWatching(interaction.guild.id)) {
      radioMetadataService.stopWatching(interaction.guild.id);
    }

    await liveLyrics.finish(interaction.guild.id, "player-stopped")

    await player.destroy()
    await interaction.editReply(simpleEmbed('Stopped the player.', true, interaction.client))
    updatePlayer(player);
}
}
