const client = require("../index");
const {addMusicControls} = require("../utilities/lavalink.js");
const {EmbedBuilder} = require("discord.js");
const {msToHMS} = require("../utilities/lavalink");
const radioMetadataService = require("../utilities/radioMetadataService");

client.lavalink.on("trackStart", async (player, track) => {
    const guild = client.guilds.cache.get(player.guildId);
    const loopMode = player.repeatMode

    console.log(`[Lavalink] Track started: ${track.info.title} - ${track.info.author} - ${track.info.uri} on discord server ${player.guildId}`);

    if (loopMode !== 'off'){
        return;
    }
    if (!guild) {
        console.warn(`[Lavalink] Guild not found for player: ${player.guildId}`);
        return;
    } else {

        const botVoiceState = guild.members.me.voice;
        if (!botVoiceState.channel) {
            return;
        }
        const channelId = botVoiceState.channel.id;

        const track = player.queue.current
        const trackInfo = track.info

        const embed = new EmbedBuilder()
            .setAuthor({name: 'Now Playing...', iconURL: guild.members.me.displayAvatarURL()})
            .setTitle(trackInfo.title)
            .setURL(trackInfo.uri)
            .setColor("#ff0000")
            .setThumbnail(trackInfo.artworkUrl)
            .addFields([
                {
                    name: 'Duration',
                    value: trackInfo.isStream ? '🔴 Live' : `${msToHMS(trackInfo.duration)}`,
                    inline: true
                },
                {name: 'Author', value: trackInfo.author, inline: true},
                {name: 'Requested By', value: track.requester.toString(), inline: true}
            ])

        if (player.radioMetadata) {
            const metadata = player.radioMetadata;

            if (metadata.stationName) {
                embed.addFields({ name: '🎙️ Station:', value: metadata.stationName, inline: true });
            }
            if (metadata.currentSong) {
                embed.addFields({ name: '🎵 Now Playing:', value: metadata.currentSong, inline: true });
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

            if (metadata.metadataInterval > 0 && metadata.url) {
                radioMetadataService.startWatching(
                    player.guildId,
                    metadata.url,
                    metadata.metadataInterval,
                    (newSong) => {
                        console.log(`[Radio] Updated metadata for guild ${player.guildId}: ${newSong}`);
                    },
                    10000
                );
            }
        }

        const message = await guild.channels.cache.get(channelId).send({embeds: [embed]})
        await addMusicControls(message, player)
    }
})