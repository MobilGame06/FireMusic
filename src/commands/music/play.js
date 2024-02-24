const { ApplicationCommandOptionType, MessageEmbed } = require("discord.js");
const { processPlayResult, updatePlayer, addMusicControls } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");

module.exports = {
  name: "play",
  description: 'play a track',
  inVc: true,
  sameVc: true,
  options: [
    {
      name: 'query',
      type: ApplicationCommandOptionType.String,
      description: 'The track which you want to play',
      required: true,
    },
  ],

  run: async (client, interaction) => {
    if (!playChecks(interaction)) { return }

    const player = interaction.client.lavalink.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: interaction.member.voice.channel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true
    });
    const query = interaction.options.getString('query');
    const result = await player.search(query, interaction.member);
    if (!loadChecks(interaction, result)) { return }

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy();
        await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'));
        return;
      }
      await player.connect();
    }

    const embed = await processPlayResult(player, result, interaction.client); // Übergeben Sie interaction.client als Argument

    updatePlayer(player, interaction.guild.id, interaction.client); // Übergeben Sie interaction.client als Argument
    const message = await interaction.editReply({ embeds: [embed] });
    await addMusicControls(message, player);

  }
};
