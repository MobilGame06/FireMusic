const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { processPlayResult, updatePlayer } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { errorEmbed, simpleEmbed } = require("../../utilities/embeds.js");
module.exports = {
  name: "shuffle",
  description: 'shuffle the queue',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    //if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    await player.queue.shuffle()
    await interaction.editReply(simpleEmbed('Shuffled the queue.', true, interaction.client))
    updatePlayer(player)
}
}
