const { EmbedBuilder, ComponentType, ActionRowBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, ModalBuilder } = require("discord.js");
const { processPlayResult, updatePlayer, addMusicControls } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { searchRadio } = require("../../utilities/radioApi.js");
const client = require("../..//index");



module.exports = {
  name: "radioplay",
  description: 'Play a radio station',
  inVc: true,
  sameVc: true,
  deferReply: false,
  run: async (client, interaction) => {
    if (!playChecks(interaction)) {
      return;
    }

    // Create the modal for inputting the radio name
    const modal = new ModalBuilder()
      .setTitle('Radio')
      .setCustomId('radioModal')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('radioName')
            .setLabel('Radio Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    // Show the modal to the user
    await interaction.showModal(modal);
  }
};

let selection;
// Handle the modal submission and radio selection
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId === 'radioModal') {
    const radioName = interaction.fields.getTextInputValue('radioName');

    // Search for radio stations based on the user's input
    const radioResult = await searchRadio(radioName);

    if (radioResult.length === 0) {
      await interaction.reply({ content: "No radio stations found.", ephemeral: true });
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
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Please select a radio station')
      .addFields({ name: 'Powered By:', value: '[RadioFM](https://www.radiofm.com)' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'radioSelect') {
    selection = interaction.values[0];

    const player = interaction.client.lavalink.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: interaction.member.voice.channel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true
    });

    const result = await player.search(selection, interaction.member);
    if (!loadChecks(interaction, result)) {
      return;
    }

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy();
        await interaction.update({ content: 'You need to be in a voice channel to use this command.', components: [], embeds: [], ephemeral: true });
        return;
      }
      await player.connect();
    }

    const embed = await processPlayResult(player, result, interaction.client, "Radio");

    updatePlayer(player, interaction.guild.id, interaction.client);
    await interaction.reply({ embeds: [embed], components: [], ephemeral: false });
  }
});
