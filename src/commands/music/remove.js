const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { updatePlayer } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const {  simpleEmbed } = require("../../utilities/embeds.js");
module.exports = {
  name: "remove",
  description: 'remove a track from the queue',
  options: [
    {
      name: 'index',
      type: ApplicationCommandOptionType.Integer,
      description: 'the index of the track',
      required: true
    }
  ],
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    const index = interaction.options.getInteger('index')

    if (index < 1 || index > player.queue.length) {
      return await interaction.editReply(simpleEmbed('Invalid index.', true, interaction.client))
    }

    const track = player.queue.splice(index - 1, 1)[0]
    await interaction.editReply(simpleEmbed(`Removed track \`#${index}\``, true, interaction.client))
    updatePlayer(player)

}
}
