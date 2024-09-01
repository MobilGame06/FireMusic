const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonInteraction, ButtonStyle, } = require("discord.js");
const { errorEmbed, simpleEmbed } = require("../utilities/embeds.js");
const LoadTypes = {
  track: 'track',
  playlist: 'playlist',
  search: 'search',
  error: 'error',
  empty: 'empty'
};

function msToHMS(ms) {
  let totalSeconds = ms / 1000
  const hours = Math.floor(totalSeconds / 3600).toString()
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60).toString()
  const seconds = Math.floor(totalSeconds % 60).toString()
  return hours === '0' ? `${minutes}:${seconds.padStart(2, '0')}` : `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}
function durationOrLive(trackInfo) {
  return trackInfo.isStream ? '🔴 Live' : msToHMS(trackInfo.duration)
}
async function processPlayResult(player, result, client, radioName = null) {
  const info = result.playlist ?? result.tracks[0].info;
  const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search;

  await player.queue.add(isTrack ? result.tracks[0] : result.tracks);
  if (!player.playing && !player.paused) { player.play(); }

  // Use radioName if provided and if title/author are not available
  const title = info.title !== 'Unknown title' ? info.title : (radioName || 'Unknown Title');
  const author = info.author !== 'Unknown artist' ? info.author : (radioName || 'Unknown Artist');

  return new EmbedBuilder()
    .setAuthor({ name: 'Added to queue.', iconURL: (result.tracks[0].requester).displayAvatarURL() })
    .setTitle(title)
    .setColor("#ff0000")
    .setURL(info.uri)
    .setThumbnail(isTrack ? result.tracks[0].info.artworkUrl : result.playlist.thumbnail)
    .addFields(isTrack ? [
      { name: 'Duration', value: durationOrLive(info), inline: true },
      { name: 'Author', value: author, inline: true },
      { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
    ] : [
      { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
      { name: 'Position', value: `${player.queue.tracks.length - result.tracks.length + 1}-${player.queue.tracks.length}`, inline: true }
    ])
    .setFooter({ text: 'FireMusic', iconURL: client.user.displayAvatarURL() });
}



function simplifyPlayer(player) {
  return player ? {
    guildId: player.guildId,
    voiceChannelId: player.voiceChannelId,
    textChannelId: player.textChannelId,
    paused: player.paused,
    volume: player.volume,
    position: player.position,
    repeatMode: player.repeatMode,
    queue: {
      tracks: player.queue?.tracks?.map((track) => ({
        info: track.info,
        requester: {
          displayName: (track.requester).displayName,
          displayAvatarURL: (track.requester).displayAvatarURL()
        }
      })),
      current: player.queue?.current ? {
        info: player.queue.current.info,
        requester: {
          displayName: (player.queue.current.requester).displayName,
          displayAvatarURL: (player.queue.current.requester).displayAvatarURL()
        }
      } : null
    },
    filters: {
      current: player.filters?.current,
      timescale: player.filters?.timescale
    }
  } : null
}

function send(type, data) {
  if (!this.ws) { return }
  data.type = type
  data.clientId = this.client.user.id
  this.ws.send(JSON.stringify(data))
  logging.debug('[WebSocket] Sent data:', data)
}
function updatePlayer(player, guildId) {
  send('playerData', {
    guildId: player?.guildId ?? guildId,
    player: simplifyPlayer(player)
  })
}



async function addMusicControls(message, player) {
  const previousButton = new ButtonBuilder()
    .setCustomId('previous')
    .setEmoji('⏮️')
    .setStyle(ButtonStyle.Secondary)
  const pauseButton = new ButtonBuilder()
    .setCustomId('pause')
    .setEmoji('⏯')
    .setStyle(ButtonStyle.Secondary)
  const skipButton = new ButtonBuilder()
    .setCustomId('skip')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary)
  const stopButton = new ButtonBuilder()
    .setCustomId('stop')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Secondary)


  const actionRow = new ActionRowBuilder()
  await message.edit({
    components: [
      actionRow.setComponents([
        previousButton,
        pauseButton,
        skipButton,
        stopButton
      ])
    ]
  })

  const collector = message.createMessageComponentCollector({ idle: 18000000 })
  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.member.voice.channel?.id !== player.voiceChannelId) {
      await buttonInteraction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
      return
    }

    switch (buttonInteraction.customId) {
      case 'previous': {
        if (player.position > 5000) {
          await player.seek(0)
          await buttonInteraction.deferUpdate()
          break
        }
        try {
          if (player.queue.previous.length === 0) {
            await buttonInteraction.reply(errorEmbed('You can\'t use the command `/previous` right now!', true))
            return
          }
          const track = player.queue.previous.shift()
          await player.play({ track: track })
          await player.queue.add(player.queue.previous.shift(), 0)
          await buttonInteraction.reply(simpleEmbed(`⏮️ Playing previous track \`#0\`: **${track.info.title}**.`, true, message.client))
        } catch (e) {
          await player.seek(0)
          await buttonInteraction.deferUpdate()
        }
        break
      }
      case 'pause': {
        player.paused ? await player.resume() : await player.pause()
        await buttonInteraction.reply(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.', true, message.client))
        break
      }
      case 'skip': {
        if (player.queue.tracks.length === 0) {
          await player.destroy()
          await buttonInteraction.reply(simpleEmbed('⏹️ Stopped', true, message.client))
          break
        }
        await player.skip()
        await buttonInteraction.reply(simpleEmbed('⏭️ Skipped', true, message.client))
        break
      }
      case 'stop': {
        await player.destroy()
        await buttonInteraction.reply(simpleEmbed('⏹️ Stopped', true, message.client))
        break
      }
    }
    updatePlayer(player)
  })
  collector.on('end', async () => {
    const fetchedMessage = await message.fetch(true).catch((e) => { logging.warn(`Failed to edit message components: ${e}`) })
    if (!fetchedMessage) { return }
    await fetchedMessage.edit({ components: [new ActionRowBuilder().setComponents(fetchedMessage.components[0].components.map((component) => ButtonBuilder.from(component.toJSON()).setDisabled(true)))] })
  })
}

module.exports = {
  processPlayResult,
  simplifyPlayer,
  updatePlayer,
  LoadTypes,
  msToHMS,
  durationOrLive,
  addMusicControls
}