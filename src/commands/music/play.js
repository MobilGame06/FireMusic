const { ApplicationCommandOptionType, MessageEmbed, EmbedBuilder } = require("discord.js");



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
    const LoadTypes = {
      track: 'track',
      playlist: 'playlist',
      search: 'search',
      error: 'error',
      empty: 'empty'
    };
    function processPlayResult(player, result) {
      const info = result.playlist ?? result.tracks[0].info
      const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search
    
      player.queue.add(isTrack ? result.tracks[0] : result.tracks)
      if (!player.playing && !player.paused) { player.play() }
    
      return new EmbedBuilder()
        .setAuthor({ name: 'Added to queue.', iconURL: (result.tracks[0].requester).displayAvatarURL() })
        .setTitle(info.title)
        .setURL(info.uri)
        .setThumbnail(isTrack ? result.tracks[0].info.artworkUrl : result.playlist.thumbnail)
        .addFields(isTrack ? [
          { name: 'Duration', value: "test", inline: true }, //durationOrLive(info)
          { name: 'Author', value: info.author, inline: true },
          { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
        ] : [
          //{ name: 'Duration', value: msToHMS(info.duration), inline: true },
          { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
          { name: 'Position', value: `${player.queue.tracks.length - result.tracks.length + 1}-${player.queue.tracks.length}`, inline: true }
        ])
        .setFooter({ text: 'Kalliope', iconURL: client.user.displayAvatarURL() })
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


    const player = interaction.client.lavalink.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: interaction.member.voice.channel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true
    })
    const query = interaction.options.getString('query')
    const result = await player.search(query, interaction.member)

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy()
        await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
        return
      }
      await player.connect()
    }

    const embed = await processPlayResult(player, result)
    updatePlayer(player, interaction.guild.id)
    const message = await interaction.editReply({ embeds: [embed] })

  }
}