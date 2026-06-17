const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, MessageFlags  } = require("discord.js");
const { processPlayResult, updatePlayer, addStopButton } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { searchRadio, getEnhancedRadioMetadata } = require("../../utilities/radioApi.js");
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

    await interaction.showModal(modal);
  }
};

let radioStationCache = new Map();
client.on('interactionCreate', async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId === 'radioModal') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const radioName = interaction.fields.getTextInputValue('radioName');

    const radioResult = await searchRadio(radioName);

    if (radioResult.length === 0) {
      await interaction.editReply({ content: "No radio stations found." });
      return;
    }

    const limitedRadioResult = radioResult.slice(0, 25).filter(station => station.program && typeof station.program === 'string');

    const cacheKey = `${interaction.user.id}_${Date.now()}`;
    radioStationCache.set(cacheKey, limitedRadioResult);

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

    await interaction.editReply({ embeds: [embed], components: [row] });
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

    const station = cachedStations[index];
    const selection = station.url;
    const stationName = station.program;

    await interaction.deferReply();

    const metadata = await getEnhancedRadioMetadata(selection, stationName);

    const player = interaction.client.lavalink.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: interaction.member.voice.channel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true
    });

    player.radioMetadata = metadata;

    const result = await player.search(selection, interaction.member);
    if (!loadChecks(interaction, result)) {
      return;
    }

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy();
        await interaction.editReply({ content: 'You need to be in a voice channel to use this command.', components: [], embeds: [] });
        return;
      }
      await player.connect();
    }

    const embed = await processPlayResult(player, result, interaction.client, "Radio");

    if (metadata.stationName) {
      embed.addFields({ name: '🎙️ Station:', value: metadata.stationName, inline: true });
    }
    if (metadata.currentSong) {
      embed.addFields({ name: '🎵 Now Playing:', value: metadata.currentSong, inline: true });
    }
    if (metadata.stationDescription) {
      embed.addFields({ name: '📝 Description:', value: metadata.stationDescription.substring(0, 1024) });
    }
    if (metadata.bitrate) {
      embed.addFields({ name: '📊 Bitrate:', value: `${metadata.bitrate} kbps`, inline: true });
    }
    if (metadata.audioCodec) {
      embed.addFields({ name: '🔊 Codec:', value: metadata.audioCodec, inline: true });
    }

    updatePlayer(player, interaction.guild.id, interaction.client);
    const message = await interaction.editReply({ embeds: [embed], components: [] });
    await addStopButton(message, player);
  }
});
