const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require('discord.js');
const radioConfig = require('../radioConfig'); // Die Konfigurationsdatei einbinden
  

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playradio")
        .setDescription("Play a radio station.")
        .addStringOption(option => option
            .setName("station")
            .setDescription("Radio station name")
            .setRequired(true)
            .addChoices(...Object.keys(radioConfig).map(radioName => ({ name: radioName, value: radioName })))
        ),
    execute: async ({ client, interaction }) => {
      if (!interaction.member.voice.channel) return interaction.reply("You need to be in a Voice Channel to play a radio station.");
  
      const stationName = interaction.options.getString("station");
      const station = radioConfig[stationName];
  
      if (!station) {
        return interaction.reply("Radio station not found in the configuration.");
      }
  
      try {
        if (!interaction.member.voice.channel) return interaction.reply("You need to be in a Voice Channel to play a song.");
  
        await client.player.play(interaction.member.voice.channel, station.url, {})
        console.log(`🎉 Now playing ${stationName} 🎉`);
  
        const playEmbed = new EmbedBuilder()
          .setTitle("Now Playing")
          .setDescription(`[${stationName}](${station.url})`)
          .addFields(
            { name: "Requested by", value: interaction.user.tag, inline: true }
          );
  
        interaction.reply({ embeds: [playEmbed] });
      } catch (e) {
        console.log(`😭 Failed to play error oh no:\n\n${e}`);
      }
    }
  };