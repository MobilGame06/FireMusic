const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Resume the current song"),

        async execute({ client, interaction }) {
            const queue = client.player.nodes.get(interaction.guildId)
            if(!queue) return interaction.reply(`No music currently playing ${interaction.member}... try again ? ❌`)

            const paused = await queue.node.resume();
            const currentTrack = queue.currentTrack
            const success = new EmbedBuilder()
                .setTitle("Resumed")
                .addFields(
                    { name: `Resume track: `, value: `[${currentTrack.title}](${currentTrack.url})`},
                )
                .setThumbnail(currentTrack.thumbnail)
            interaction.reply({ embeds: [success]})
        }
}