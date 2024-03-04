const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { updatePlayer } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const { simpleEmbed } = require("../../utilities/embeds.js");

module.exports = {
  name: "clear",
  description: 'clears the queue',
  inVc: true,
  sameVc: true,

  run: async (client, interaction) => {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    player.queue.splice(0, player.queue.tracks.length)
    await interaction.editReply(simpleEmbed('Cleared the queue.', true, interaction.client))
    updatePlayer(player)
  }
};
