const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { updatePlayer, msToHMS, addMusicControls } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const {  simpleEmbed } = require("../../utilities/embeds.js");
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

    const progress = Math.round(20 * player.position / trackInfo.duration)
    const progressBar = '▬'.repeat(progress) + '🔘'.repeat(20 - progress)

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'Now Playing...', iconURL: interaction.member.displayAvatarURL() })
        .setTitle(trackInfo.title)
        .setURL(trackInfo.uri)
        .setThumbnail(trackInfo.artworkUrl)
        .addFields([
        { name: 'Duration', value: trackInfo.isStream ? '🔴 Live' : `\`${progressBar}\`\n\`${msToHMS(player.position)}/${msToHMS(trackInfo.duration)}\``, inline: true },
        { name: 'Author', value: trackInfo.author, inline: true },
        { name: 'Requested By', value: track.requester.toString(), inline: true }
        ])
        //.setFooter({ text: `Kalliope | Repeat: ${formatRepeatMode(player.repeatMode)}`, iconURL: interaction.client.user.displayAvatarURL() })

        if (track.pluginInfo.uri) { embed.setDescription(`This track has been resolved on [Youtube](${track.pluginInfo.uri})`) }

        const message = await interaction.editReply({ embeds: [embed], fetchReply: true })
        await addMusicControls(message, player)
}
}
