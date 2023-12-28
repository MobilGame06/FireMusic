const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("reverseovertake")
        .setDescription("reverseOvertake song"),
        execute: async ({ client, interaction }) => {
            if (!interaction.member.voice.channel) return interaction.reply("You need to be in a Voice Channel to play a song.");
    
            let song = "https://www.youtube.com/watch?v=aFnUWcRHptU"
            try {
                const { track } = await client.player.play(interaction.member.voice.channel, song, {
                });
                console.log(`🎉 I am playing ${track.title} 🎉`);
    
                const playEmbed = new EmbedBuilder()
                    .setTitle("Now Playing")
                    .setDescription(`[${track.title}](${track.url})`)
                    .setThumbnail(track.thumbnail)
                    .addFields(
                        { name: "Duration", value: track.duration, inline: true},
                        { name: "Requested by", value: interaction.user.tag, inline: true}
                    )
    
                interaction.reply({ embeds: [playEmbed]})
            } catch (e) {
                console.log(`😭 Failed to play error oh no:\n\n${e}`);
            }
        }
    }