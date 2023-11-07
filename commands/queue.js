const { EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require("@discordjs/builders")
const { pagination, ButtonTypes, ButtonStyles } = require('@devraelfreeze/discordjs-pagination')

const ITEMS_PER_PAGE = 20

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show list of queued songs'),

    async execute({ client, interaction }){
        const queue = client.player.nodes.get(interaction.guildId)
        if (!queue || !queue.node.isPlaying()) return interaction.reply(`No music currently playing ${interaction.member}... try again ? ❌`)
        if (!queue.tracks.toArray()[0]) return  interaction.reply(`No music in the queue after the current one ${interaction.member}... try again ? ❌`)

        const songs = queue.getSize()
        const tracks = queue.tracks.toArray().map((track, i) => `**${i + 1} - ${track.title} | ${track.author}**`)
        const mode = ['OFF', '🔁', '🔂', '🅰️'];
        const pages = []

        for(let i = 0; i < Math.ceil(tracks.length / ITEMS_PER_PAGE); i++){
            const startIndex = i * ITEMS_PER_PAGE
            const endIndex = startIndex + ITEMS_PER_PAGE
            const nextSongs = songs > ITEMS_PER_PAGE ? endIndex > songs ? '~ End of the queue ~' : `And **${songs - endIndex}** other song(s)...` : `**${songs}** song(s) in the playlist`
            const embed = new EmbedBuilder()
                .setTitle(`Queue List - Page ${i+1} | Loop Mode: ${mode[queue.repeatMode]}`)
                .setDescription(`Now playing: **${queue.currentTrack.title}**\n\n${tracks.slice(startIndex, endIndex).join('\n')}\n\n${nextSongs}`)
                .setColor('#ff0000')
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