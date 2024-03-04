const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { updatePlayer } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const {  simpleEmbed } = require("../../utilities/embeds.js");
module.exports = {
  name: "skip",
  description: 'skips the current track',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    if (player.queue.tracks.length === 0) {
        await player.destroy();
        try {
            await interaction.editReply(simpleEmbed('There are no songs in the queue to skip.', true, interaction.client));
        } catch (error) {
            console.error('Error while replying to interaction:', error);
        }
        return;
    }
    await player.skip();
    await interaction.editReply(simpleEmbed('Skipped the current track.', true, interaction.client));
    
    updatePlayer(player);
}


}
