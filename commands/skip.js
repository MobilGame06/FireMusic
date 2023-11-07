const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skips the current song"),

        async execute({ client, interaction }) {
            const queue = client.player.nodes.get(interaction.guildId);
            if (!queue || !queue.node.isPlaying()) return interaction.reply(`No music currently playing ${interaction.member}... try again ? ❌`)

            const success = await queue.node.skip();
            const currentTrack = queue.currentTrack
            if (success == true) {
                const success = new EmbedBuilder()
                    .setTitle("Skip")
                    .addFields(
                        { name: `Skipped track: `, value: `[${currentTrack.title}](${currentTrack.url})`},
                    )
                    .setThumbnail(currentTrack.thumbnail)
            interaction.reply({ embeds: [success]})
            }else{
                interaction.reply("Something went wrong")
            }
        }
}