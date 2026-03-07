const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { updatePlayer, msToHMS, addMusicControls } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const { simpleEmbed } = require("../../utilities/embeds.js");
const radioMetadataService = require("../../utilities/radioMetadataService");
module.exports = {
  name: "nowplaying",
  description: 'shows the current playing track',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    const track = player.queue.current
    const trackInfo = track.info

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Now Playing...', iconURL: interaction.member.displayAvatarURL() })
      .setTitle(trackInfo.title)
      .setURL(trackInfo.uri)
      .setColor("#ff0000")
      .setThumbnail(trackInfo.artworkUrl)
      .addFields([
        { name: 'Duration', value: trackInfo.isStream ? '🔴 Live' : `${msToHMS(player.position)}/${msToHMS(trackInfo.duration)}`, inline: true },
        { name: 'Author', value: trackInfo.author, inline: true },
        { name: 'Requested By', value: track.requester.toString(), inline: true }
      ])

    if (player.radioMetadata) {
      const metadata = player.radioMetadata;

      if (metadata.stationName) {
        embed.addFields({ name: '🎙️ Station:', value: metadata.stationName, inline: true });
      }

      let currentSong = metadata.currentSong;
      if (radioMetadataService.isWatching(interaction.guild.id)) {
        const watchedSong = radioMetadataService.getCurrentSong(interaction.guild.id);
        if (watchedSong) {
          currentSong = watchedSong;
        }
      }

      if (currentSong) {
        embed.addFields({ name: '🎵 Now Playing:', value: currentSong, inline: true });
      }
      if (metadata.bitrate) {
        embed.addFields({ name: '📊 Bitrate:', value: `${metadata.bitrate} kbps`, inline: true });
      }
      if (metadata.audioCodec) {
        embed.addFields({ name: '🔊 Codec:', value: metadata.audioCodec, inline: true });
      }
      if (metadata.stationDescription) {
        embed.addFields({ name: '📝 Description:', value: metadata.stationDescription.substring(0, 1024) });
      }
    }

    if (track.pluginInfo.uri) { embed.setDescription(`This track has been resolved on [Youtube](${track.pluginInfo.uri})`) }

    const message = await interaction.editReply({ embeds: [embed], fetchReply: true })
    await addMusicControls(message, player)
  }
}
