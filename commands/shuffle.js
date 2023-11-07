const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Shuffles the songs"),

        async execute({ client, interaction }) {
            const queue = client.player.nodes.get(interaction.guildId);
            if (!queue || !queue.node.isPlaying()) return interaction.reply(`No music currently playing ${interaction.member}... try again ? ❌`)
            if (!queue.tracks.toArray()[0]) return  interaction.reply(`No music in the queue after the current one ${interaction.member}... try again ? ❌`)
    
            await queue.tracks.shuffle()
            interaction.reply("Shuffled the queue")       
        }
}