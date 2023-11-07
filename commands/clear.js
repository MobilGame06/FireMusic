const { EmbedBuilder, Embed } = require('discord.js');
const { SlashCommandBuilder } = require("@discordjs/builders")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear all songs in the queue'),

        async execute({ client, interaction }) {
            const queue = client.player.nodes.get(interaction.guildId)
            if (!queue || !queue.node.isPlaying()) {
                const NoMusicEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`No music is currently playing. Nothing to clear, ${interaction.member}! ❌`);
                interaction.reply({ embeds: [NoMusicEmbed]})
                return;
            }
            if (!queue.tracks.toArray()[0]) {
                const NoQueueEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`No songs in the queue after the current one, ${interaction.member}! ❌`);
            interaction.reply({ embeds: [NoQueueEmbed]})
            return
            } 
    
            await queue.tracks.clear();
            const clearedQueueEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`The queue has been cleared successfully! 🗑️`);
            interaction.reply({ embeds: [clearedQueueEmbed]})
        }
}