const { ApplicationCommandOptionType, MessageEmbed, EmbedBuilder } = require("discord.js");
const { pagination, ButtonTypes, ButtonStyles } = require('@devraelfreeze/discordjs-pagination')
const { processPlayResult, updatePlayer } = require("../../utilities/lavalink.js");
const { loadChecks, playChecks } = require("../../utilities/checks.js");
const { errorEmbed, simpleEmbed } = require("../../utilities/embeds.js");


const ITEMS_PER_PAGE = 20

module.exports = {
  name: "queue",
  description: 'show the queue',
  inVc: true,
  sameVc: true,
  run: async (client, interaction) => {
    //if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if(player.queue.tracks.length < 1){
        await interaction.editReply(simpleEmbed('There are no songs in the queue.', true, interaction.client));
        return;
    }

    const queue = player.queue
    const songs = queue.tracks.length
    const tracks = queue.tracks.map((track, i) => `**${i + 1}.** [${track.info.title}](${track.info.uri})`).join('\n');
    const pages = []


    
    for(let i = 0; i < Math.ceil(queue.tracks.length / ITEMS_PER_PAGE); i++){
        const startIndex = i * ITEMS_PER_PAGE
        const endIndex = startIndex + ITEMS_PER_PAGE
        const nextSongs = songs > ITEMS_PER_PAGE ? queue.tracks.slice(startIndex, endIndex) : queue.tracks
        const embed = new EmbedBuilder()
            .setTitle('Queue - Page ' + (i + 1))
            .setColor('#ff0000')
            .setDescription(`Now playing: ${queue.current.info.title}\n\n${tracks.split('\n').slice(startIndex, endIndex).join('\n')}\n\n`)
            .setFooter({ text: `Page ${i + 1} of ${Math.ceil(queue.tracks.length / ITEMS_PER_PAGE)}` })
            .setTimestamp()
    pages.push(embed)
    }



    if(pages.length >= 1) await pagination({
        embeds: pages,
        author: interaction.member.user,
        interaction: interaction,
        ephemeral: true,
        time: 60000,
        disableButtons: true,
        fastSkip: true,
        pageTravel: true,
        buttons: [
            {
                value: ButtonTypes.previous,
                label: 'Previous',
                style: ButtonStyles.Secondary
            },
            {
                value: ButtonTypes.next,
                label: 'Next',
                style: ButtonStyles.Primary
            }
        ]
    })
}
}