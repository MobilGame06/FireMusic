const { EmbedBuilder } = require("discord.js");
function errorEmbed(content, ephemeral) {
    return {
      embeds: [
        new EmbedBuilder()
          .setDescription(content)
          .setColor("#ff0000")
          .setTimestamp() 
          .setFooter({ text: 'FireMusic'})
      ],
      ephemeral: ephemeral
    }
}

function simpleEmbed(content, ephemeral, client) {
  return {
    embeds: [
      new EmbedBuilder()
        .setDescription(content)
        .setColor("#ff0000")
        .setTimestamp() 
        .setFooter({ text: 'FireMusic', iconURL: client.user.displayAvatarURL() }) 
    ],
    ephemeral: ephemeral
  }
}


module.exports = {
    errorEmbed,
    simpleEmbed
}