const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');
const { QueueRepeatMode } = require("discord-player")
module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("loop queue/track/autoplay")
        .addNumberOption(option => option
            .setName("select")
            .setDescription("select an option")
            .setRequired(true)
            .addChoices(
                { name: 'off', value: QueueRepeatMode.OFF },
                { name: "track", value: QueueRepeatMode.TRACK },
                { name: 'queue', value: QueueRepeatMode.QUEUE },
                { name: 'autoplay', value: QueueRepeatMode.AUTOPLAY }
            )
        ),
        async execute({ client, interaction }) {
            try {
                const queue = client.player.nodes.get(interaction.guild)
        
                if (!queue || !queue.isPlaying()) {
                    const noQueueEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(`The Queue is empty, ${interaction.member}! ❌`);
                interaction.reply({ embeds: [noQueueEmbed]})
                return
                }
                const loopMode = interaction.options.getNumber("select")
        
                queue.setRepeatMode(loopMode)
                const mode = loopMode === QueueRepeatMode.TRACK ? `TrackRepeat` : loopMode === QueueRepeatMode.QUEUE ? `QueueRepeat` : loopMode === QueueRepeatMode.OFF ? `OFF` : `Autoplay`
                const loopSetEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setDescription(`The loop mode was set to: ${mode}! ✔️`);
                interaction.reply({ embeds: [loopSetEmbed]})
                return 
            }catch (error) {
                console.log(error)
            }
        }
}