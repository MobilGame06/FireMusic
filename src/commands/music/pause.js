const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { processPlayResult, updatePlayer } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { errorEmbed, simpleEmbed } = require("../../utilities/embeds.js");
module.exports = {
  name: "pause",
  description: 'pause/resume the current track',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    //if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    player.paused ? await player.resume() : await player.pause();
    await interaction.editReply(simpleEmbed(player.paused ? 'Paused the current track.' : 'Resumed the current track.', true, interaction.client))
    updatePlayer(player)
}


}
