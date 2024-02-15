const { EmbedBuilder } = require("discord.js");
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
  async function processPlayResult(player, result, client) {
    const info = result.playlist ?? result.tracks[0].info;
    const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search;
  
    await player.queue.add(isTrack ? result.tracks[0] : result.tracks);
    if (!player.playing && !player.paused) { player.play(); }
  
    return new EmbedBuilder()
      .setAuthor({ name: 'Added to queue.', iconURL: (result.tracks[0].requester).displayAvatarURL() })
      .setTitle(info.title)
      .setColor("#ff0000")
      .setURL(info.uri)
      .setThumbnail(isTrack ? result.tracks[0].info.artworkUrl : result.playlist.thumbnail)
      .addFields(isTrack ? [
        { name: 'Duration', value: durationOrLive(info), inline: true }, 
        { name: 'Author', value: info.author, inline: true },
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
  function updatePlayer(player, guildId){
    send('playerData', {
      guildId: player?.guildId ?? guildId,
      player: simplifyPlayer(player)
    })
  }


module.exports = {
    processPlayResult,
    simplifyPlayer,
    updatePlayer,
    LoadTypes,
    msToHMS,
    durationOrLive
}