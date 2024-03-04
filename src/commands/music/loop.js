const { ApplicationCommandOptionType } = require("discord.js");
const { updatePlayer } = require("../../utilities/lavalink.js");
const { genericChecks } = require("../../utilities/checks.js");
const { simpleEmbed } = require("../../utilities/embeds.js");

module.exports = {
    name: "loop",
    description: 'sets the loop mode',
    options: [
      {
        name: 'mode',
        type: ApplicationCommandOptionType.String,
        description: 'the loop mode',
        required: true,
        choices: [
            { name: 'Off', value: 'off'},
            { name: 'Track', value: 'track'},
            { name: 'Queue', value: 'queue'}
        ]
      }
    ],
    inVc: true,
    sameVc: true,
    run: async (client, interaction) => {
      if (!genericChecks(interaction)) { return }
      const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

      const mode = interaction.options.getString('mode')
      await player.setRepeatMode(mode)
      await interaction.editReply(simpleEmbed(`Loop mode set to ${mode}.`, true, interaction.client))
      updatePlayer(player)
  }
  }