const { ApplicationCommandOptionType, EmbedBuilder, ComponentType, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { processPlayResult, updatePlayer, addMusicControls } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { searchRadio } = require("../../utilities/radioApi.js");

module.exports = {
  name: "radioplay",
  description: 'play a radio station',
  inVc: true,
  sameVc: true,
  options: [
    {
      name: 'query',
      type: ApplicationCommandOptionType.String,
      description: 'The station which you want to play',
      required: true,
    },
  ],

  run: async (client, interaction) => {
    if (!playChecks(interaction)) { return }

    const query = interaction.options.getString('query');
    const radioResult = await searchRadio(query);

    if (radioResult.length === 0) {
      await interaction.editReply({ content: "No radio stations found.", ephemeral: true });
      return;
    }

    const limitedRadioResult = radioResult.slice(0, 25);

    const selectMenuOptions = limitedRadioResult.map(station => ({
      label: station.program,
      value: station.url
    }));
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('radioSelect')
      .setPlaceholder('Select a radio station')
      .addOptions(selectMenuOptions)
      .setMinValues(1)
      .setMaxValues(1)


    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Please select a radio station')
      .addFields({ name: 'Powered By:', value: '[RadioFM](https://www.radiofm.com)' })
      .setTimestamp()

    const reply = await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

    collector.on('collect', async i => {
      const selection = i.values[0];
      await console.log(selection);
      const player = interaction.client.lavalink.createPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: interaction.member.voice.channel.id,
        textChannelId: interaction.channel.id,
        selfDeaf: true
      });
      const result = await player.search(selection, interaction.member);
      if (!loadChecks(interaction, result)) { return }

      if (!player.connected) {
        if (!interaction.member.voice.channel) {
          await player.destroy();
          await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'));
          return;
        }
        await player.connect();
      }

      const embed = await processPlayResult(player, result, interaction.client);

      updatePlayer(player, interaction.guild.id, interaction.client);
      const message = await interaction.editReply({ embeds: [embed], ephemeral: true });
      await addMusicControls(message, player);
    });

  }
};
