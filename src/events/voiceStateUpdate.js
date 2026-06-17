const client = require("../index");

const idleMs = (parseInt(process.env.IDLE_DISCONNECT_MINUTES, 10) || 5) * 60_000;
const disconnectTimers = new Map();

function isBotAlone(channel) {
    return channel.members.filter(member => !member.user.bot).size === 0;
}

function cancelDisconnect(guildId) {
    const existing = disconnectTimers.get(guildId);
    if (existing) {
        clearTimeout(existing);
        disconnectTimers.delete(guildId);
    }
}

function scheduleDisconnect(guildId, channel) {
    cancelDisconnect(guildId);
    const timer = setTimeout(() => {
        disconnectTimers.delete(guildId);
        const freshChannel = client.channels.cache.get(channel.id);
        if (!freshChannel || !isBotAlone(freshChannel)) return;
        const player = client.lavalink.getPlayer(guildId);
        if (player) player.destroy();
    }, idleMs);
    disconnectTimers.set(guildId, timer);
}

client.on('voiceStateUpdate', (oldState, newState) => {
    const guild = newState.guild;
    const botChannel = guild.members.me?.voice?.channel;

    if (!botChannel) {
        cancelDisconnect(guild.id);
        return;
    }

    if (oldState.channelId !== botChannel.id && newState.channelId !== botChannel.id) {
        return;
    }

    if (isBotAlone(botChannel)) {
        scheduleDisconnect(guild.id, botChannel);
    } else {
        cancelDisconnect(guild.id);
    }
});
