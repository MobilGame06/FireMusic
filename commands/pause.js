const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pauses the current song"),

        async execute({ client, interaction }) {
            const queue = client.player.nodes.get(interaction.guildId)
            if(!queue || !queue.node.isPlaying()) return interaction.reply(`No music currently playing ${interaction.member}... try again ? ❌`)

            const paused = await queue.node.pause();
            const currentTrack = queue.currentTrack
            const success = new EmbedBuilder()
                .setTitle("Paused")
                .addFields(
                    { name: `Paused track: `, value: `[${currentTrack.title}](${currentTrack.url})`},
                )
                .setThumbnail(currentTrack.thumbnail)
            interaction.reply({ embeds: [success]})
        }
}