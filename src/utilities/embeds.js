const { EmbedBuilder, MessageFlags } = require("discord.js");

function errorEmbed(content, ephemeral = false) {
    return {
        embeds: [
            new EmbedBuilder()
                .setDescription(content)
                .setColor("#ff0000")
                .setTimestamp()
                .setFooter({ text: 'FireMusic' })
        ],
        flags: ephemeral ? MessageFlags.Ephemeral : undefined
    };
}

function simpleEmbed(content, ephemeral = false, client) {
    return {
        embeds: [
            new EmbedBuilder()
                .setDescription(content)
                .setColor("#ff0000")
                .setTimestamp()
                .setFooter({ text: 'FireMusic', iconURL: client.user.displayAvatarURL() })
        ],
        flags: ephemeral ? MessageFlags.Ephemeral : undefined
    };
}

module.exports = {
    errorEmbed,
    simpleEmbed
};