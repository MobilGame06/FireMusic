const { SlashCommandBuilder } = require("@discordjs/builders")
const { EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("Shows lyrics of the current song"),

        async execute({ client, interaction }) {
            const success = new EmbedBuilder()
            .setTitle("Lyrics")
            .addFields(
                { name: `Google doch selber du hurensohn`, value: `[GOOGLE](https://www.youtube.com/watch?v=dQw4w9WgXcQ)`},
            )
        interaction.reply({ embeds: [success]})
    }
}