const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, MessageFlags  } = require("discord.js");
const { processPlayResult, updatePlayer, addStopButton } = require("../../utilities/lavalink.js");
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

let radioStationCache = new Map();
// Handle the modal submission and radio selection
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId === 'radioModal') {
    const radioName = interaction.fields.getTextInputValue('radioName');

    // Search for radio stations based on the user's input
    const radioResult = await searchRadio(radioName);

    if (radioResult.length === 0) {
      await interaction.reply({ content: "No radio stations found.", flags: MessageFlags.Ephemeral});
      return;
    }

    const limitedRadioResult = radioResult.slice(0, 25).filter(station => station.program && typeof station.program === 'string');

    // Cache stations with index-based IDs
    const cacheKey = `${interaction.user.id}_${Date.now()}`;
    radioStationCache.set(cacheKey, limitedRadioResult);

    // Clean up old cache entries after 5 minutes
    setTimeout(() => radioStationCache.delete(cacheKey), 300000);

    const selectMenuOptions = limitedRadioResult.map((station, index) => ({
      label: station.program.substring(0, 100),
      value: `${cacheKey}_${index}`
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
      .addFields({ name: 'Powered By:', value: '[Radio-Browser](https://www.radio-browser.info/)' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'radioSelect') {
    const selectedValue = interaction.values[0];
    const lastUnderscoreIndex = selectedValue.lastIndexOf('_');
    const cacheKey = selectedValue.substring(0, lastUnderscoreIndex);
    const index = parseInt(selectedValue.substring(lastUnderscoreIndex + 1));

    const cachedStations = radioStationCache.get(cacheKey);

    if (!cachedStations || !cachedStations[index]) {
      await interaction.update({ content: 'Selection expired. Please try again.', components: [], embeds: [] });
      return;
    }

    const selection = cachedStations[index].url;

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
    await interaction.deferReply({ ephemeral: false })
    const message = await interaction.editReply({ embeds: [embed], components: [] });
    await addStopButton(message, player);
  }
});
