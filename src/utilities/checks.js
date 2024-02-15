const { ChatInputCommandInteraction, PermissionsBitField } = require("discord.js");
const { LoadTypes } = require("./lavalink");
const { errorEmbed } = require("../utilities/embeds.js");

function loadChecks(interaction, result) {
    if (result.loadType === LoadTypes.error) {
      interaction.editReply(errorEmbed('There was an error while adding your song to the queue.'))
      return false
    }
    if (result.loadType === LoadTypes.empty) {
      interaction.editReply(errorEmbed('There were no tracks found using your query.'))
      return false
    }
    return true
  }

  function playChecks(interaction) {
    const channel = interaction.member.voice.channel
    if (!channel) {
      interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.', true))
      return false
    }
    if (interaction.guild.members.me.voice.channel && channel !== interaction.guild.members.me.voice.channel) {
      interaction.editReply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
      return false
    }
    if (!interaction.guild.members.me.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
      interaction.editReply(errorEmbed('The bot does not have the correct permissions to play in your voice channel!\nMake sure it is able to connect to and speak in your channel.', true))
      return false
    }
    if (!interaction.guild.members.me.permissionsIn(interaction.channel).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions])) {
      interaction.editReply(errorEmbed('The bot does not have the correct permissions for this text channel!\nMake sure it can send and react to messages in this channel.', true))
      return false
    }
    return true
  }

  module.exports = {
    loadChecks,
    playChecks
  }