const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { processPlayResult, updatePlayer } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { errorEmbed, simpleEmbed } = require("../../utilities/embeds.js");
module.exports = {
  name: "previous",
  description: 'previous the current track',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    //if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    if (player.queue.previous.length === 0) {
        await player.destroy();
        try {
            await interaction.editReply(simpleEmbed('There are no songs in the queue to go back.', true, interaction.client));
        } catch (error) {
            console.error('Error while replying to interaction:', error);
        }
        return;
    }
    const track = player.queue.previous.shift()
    await player.play({ track: track })
    await player.queue.add(player.queue.previous.shift(), 0)
    await interaction.editReply(simpleEmbed('Playing previous track.', true, interaction.client));
    updatePlayer(player);
}


}
